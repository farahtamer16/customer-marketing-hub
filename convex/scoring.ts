// Computes account scores from data actually recorded on the account —
// signals (website/campaign/social/email/crm/product/support activity) and
// the buying-group roster — instead of the static numbers the old demo data
// hardcoded. Recency-weighted so a stale account's score decays over time
// rather than staying pinned at whatever it started at.
//
// Honest limitation: "adoption" here can only reflect product-usage
// *signals* that have actually been logged against the account (source:
// "product") — this app has no live link between a growth account and a
// real logged-in tenant, so it can't independently detect "this account's
// users logged in / created a post" the way a true product-analytics
// integration would. Logging a product-usage signal (manually today, via a
// real integration later) is what feeds this number.

type BuyingRole = "decisionMaker" | "champion" | "user" | "technicalEvaluator";
type MemberStatus = "active" | "missing" | "atRisk";
type SignalKind =
  | "pricingVisit"
  | "socialQuestion"
  | "campaignClick"
  | "demoRequested"
  | "trialStarted"
  | "postCreated"
  | "productLogin"
  | "teamInvited"
  | "supportOpened"
  | "supportResolved"
  | "renewalViewed";
type SignalSource =
  | "website"
  | "campaign"
  | "social"
  | "email"
  | "crm"
  | "product"
  | "support";
type GrowthStage =
  | "discover"
  | "engaged"
  | "demo"
  | "trial"
  | "activated"
  | "customer"
  | "renewal";
type NextAction =
  | "bookExecutiveDemo"
  | "shareSecurityGuide"
  | "inviteSecondAdmin"
  | "resolveSupportBlocker"
  | "launchRenewalReview";

interface ScoringMember {
  role: BuyingRole;
  status: MemberStatus;
}
interface ScoringSignal {
  source: SignalSource;
  kind: SignalKind;
  occurredAt: number;
}
interface ScoringAccount {
  stage: GrowthStage;
  members: ScoringMember[];
  signals: ScoringSignal[];
}

const DAY_MS = 24 * 60 * 60 * 1000;
const RECENCY_WINDOW_DAYS = 90;

function recencyFactor(occurredAt: number, now: number) {
  const ageDays = (now - occurredAt) / DAY_MS;
  return Math.max(0, 1 - ageDays / RECENCY_WINDOW_DAYS);
}

const INTENT_WEIGHT_BY_KIND: Record<SignalKind, number> = {
  demoRequested: 25,
  trialStarted: 20,
  renewalViewed: 12,
  pricingVisit: 15,
  socialQuestion: 10,
  campaignClick: 8,
  teamInvited: 5,
  postCreated: 3,
  productLogin: 2,
  supportResolved: 2,
  supportOpened: -5,
};

export function computeIntentScore(account: ScoringAccount, now = Date.now()): number {
  let score = 0;
  for (const signal of account.signals) {
    score += (INTENT_WEIGHT_BY_KIND[signal.kind] ?? 5) * recencyFactor(signal.occurredAt, now);
  }
  const activeDecisionMakers = account.members.filter(
    (m) => m.role === "decisionMaker" && m.status !== "missing",
  ).length;
  score += activeDecisionMakers * 15;
  return Math.max(0, Math.min(100, Math.round(score)));
}

export function computeEngagementScore(account: ScoringAccount, now = Date.now()): number {
  const recentSignalWeight = account.signals.reduce(
    (sum, signal) => sum + recencyFactor(signal.occurredAt, now),
    0,
  );
  const activeMembers = account.members.filter((m) => m.status === "active").length;
  const totalMembers = account.members.length || 1;
  const coverageRatio = activeMembers / totalMembers;
  const score = recentSignalWeight * 8 + coverageRatio * 40;
  return Math.max(0, Math.min(100, Math.round(score)));
}

export function computeAdoptionScore(account: ScoringAccount, now = Date.now()): number {
  const score = account.signals
    .filter((s) => s.source === "product")
    .reduce((sum, signal) => sum + recencyFactor(signal.occurredAt, now) * 20, 0);
  return Math.max(0, Math.min(100, Math.round(score)));
}

const BUYING_ROLES: BuyingRole[] = ["decisionMaker", "champion", "user", "technicalEvaluator"];

export function computeBuyingGroupCoverage(members: ScoringMember[]): number {
  const covered = BUYING_ROLES.filter((role) =>
    members.some((m) => m.role === role && m.status !== "missing"),
  ).length;
  return Math.round((covered / BUYING_ROLES.length) * 100);
}

export function computeNextAction(
  account: ScoringAccount & { intentScore: number; buyingGroupCoverage: number },
  now = Date.now(),
): NextAction {
  const openSupport = account.signals
    .filter((s) => s.kind === "supportOpened" || s.kind === "supportResolved")
    .sort((a, b) => b.occurredAt - a.occurredAt)[0];
  if (openSupport?.kind === "supportOpened" && recencyFactor(openSupport.occurredAt, now) > 0) {
    return "resolveSupportBlocker";
  }
  if (account.stage === "renewal") return "launchRenewalReview";
  if (account.buyingGroupCoverage < 100 && account.stage !== "discover") {
    return "inviteSecondAdmin";
  }
  if (account.intentScore >= 70 && ["discover", "engaged", "demo"].includes(account.stage)) {
    return "bookExecutiveDemo";
  }
  return "shareSecurityGuide";
}

// A lead's own "will they buy" score isn't typed in by hand — it's derived
// from the account's own real, signal-driven intent score, scaled by how
// much that buying role typically influences a B2B purchase decision. A
// decision-maker at a hot account scores higher than a day-to-day user at
// the same account; either way it's the account's real intent score doing
// the driving, not a guess.
const ROLE_BUYING_WEIGHT: Record<BuyingRole, number> = {
  decisionMaker: 1.1,
  champion: 1.0,
  technicalEvaluator: 0.8,
  user: 0.7,
};

export function computeMemberScore(role: BuyingRole, accountIntentScore: number): number {
  const score = accountIntentScore * ROLE_BUYING_WEIGHT[role];
  return Math.max(0, Math.min(100, Math.round(score)));
}

export function computeAccountScores(account: ScoringAccount, now = Date.now()) {
  const buyingGroupCoverage = computeBuyingGroupCoverage(account.members);
  const intentScore = computeIntentScore(account, now);
  return {
    intentScore,
    engagementScore: computeEngagementScore(account, now),
    adoptionScore: computeAdoptionScore(account, now),
    buyingGroupCoverage,
    nextAction: computeNextAction({ ...account, intentScore, buyingGroupCoverage }, now),
  };
}

// A real explanation of "why is this score what it is," not just the
// number — every signal that fed a score, with its raw weight, how much
// recency decayed it, and its actual contribution. Mirrors the weights and
// formulas in computeIntentScore/computeEngagementScore/computeAdoptionScore
// above (same weight tables, same recencyFactor) — if those change, this
// must change with them, since this is an explanatory view of the same
// math, not an independent calculation.
export interface SignalForBreakdown extends ScoringSignal {
  id: string;
  detail?: string;
}

export interface ScoreContribution {
  signalId: string;
  kind: SignalKind;
  source: SignalSource;
  occurredAt: number;
  detail?: string;
  rawWeight: number;
  recencyFactor: number;
  contribution: number;
}

function contributionsFor(
  signals: SignalForBreakdown[],
  weightByKind: (kind: SignalKind) => number,
  now: number,
): ScoreContribution[] {
  return signals
    .map((signal) => {
      const rawWeight = weightByKind(signal.kind);
      const factor = Math.round(recencyFactor(signal.occurredAt, now) * 100) / 100;
      return {
        signalId: signal.id,
        kind: signal.kind,
        source: signal.source,
        occurredAt: signal.occurredAt,
        detail: signal.detail,
        rawWeight,
        recencyFactor: factor,
        contribution: Math.round(rawWeight * factor * 10) / 10,
      };
    })
    .filter((contribution) => contribution.contribution !== 0)
    .sort((a, b) => Math.abs(b.contribution) - Math.abs(a.contribution));
}

export interface ScoreBreakdown {
  intent: {
    signals: ScoreContribution[];
    decisionMakerBonus: number;
    activeDecisionMakers: number;
    total: number;
  };
  engagement: {
    signals: ScoreContribution[];
    coverageBonus: number;
    activeMembers: number;
    totalMembers: number;
    total: number;
  };
  adoption: {
    signals: ScoreContribution[];
    total: number;
  };
}

export function computeScoreBreakdown(
  account: { members: ScoringMember[]; signals: SignalForBreakdown[] },
  now = Date.now(),
): ScoreBreakdown {
  const intentSignals = contributionsFor(
    account.signals,
    (kind) => INTENT_WEIGHT_BY_KIND[kind] ?? 5,
    now,
  );
  const activeDecisionMakers = account.members.filter(
    (m) => m.role === "decisionMaker" && m.status !== "missing",
  ).length;
  const decisionMakerBonus = activeDecisionMakers * 15;
  const intentTotal = Math.max(
    0,
    Math.min(
      100,
      Math.round(
        intentSignals.reduce((sum, c) => sum + c.contribution, 0) + decisionMakerBonus,
      ),
    ),
  );

  const engagementSignals = contributionsFor(account.signals, () => 8, now);
  const activeMembers = account.members.filter((m) => m.status === "active").length;
  const totalMembers = account.members.length || 1;
  const coverageBonus = Math.round((activeMembers / totalMembers) * 40 * 10) / 10;
  const engagementTotal = Math.max(
    0,
    Math.min(
      100,
      Math.round(
        engagementSignals.reduce((sum, c) => sum + c.contribution, 0) + coverageBonus,
      ),
    ),
  );

  const adoptionSignals = contributionsFor(
    account.signals.filter((s) => s.source === "product"),
    () => 20,
    now,
  );
  const adoptionTotal = Math.max(
    0,
    Math.min(100, Math.round(adoptionSignals.reduce((sum, c) => sum + c.contribution, 0))),
  );

  return {
    intent: {
      signals: intentSignals,
      decisionMakerBonus,
      activeDecisionMakers,
      total: intentTotal,
    },
    engagement: {
      signals: engagementSignals,
      coverageBonus,
      activeMembers,
      totalMembers,
      total: engagementTotal,
    },
    adoption: { signals: adoptionSignals, total: adoptionTotal },
  };
}
