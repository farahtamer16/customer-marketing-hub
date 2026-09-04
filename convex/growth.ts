import { query, mutation, internalMutation } from "./_generated/server";
import type { MutationCtx } from "./_generated/server";
import { v } from "convex/values";
import type { Doc } from "./_generated/dataModel";
import { requirePermission } from "./authz";
import { computeAccountScores, computeMemberScore, computeScoreBreakdown } from "./scoring";

// A lead's score is never client-supplied — it's this account's real
// intent score, scaled by how much that buying role typically influences
// a purchase decision. Re-run every time the account's signals change so
// leads stay in sync with the same real data driving the account score,
// instead of freezing at whatever number was true when they were added.
function recomputeMemberScores(
  members: Doc<"growthAccounts">["members"],
  intentScore: number,
) {
  return members.map((member) => ({
    ...member,
    score: computeMemberScore(member.role, intentScore),
  }));
}

// Shared by every place that auto-logs a signal (as opposed to a user
// filling in the "Log a signal" dialog by hand): appends the signal and
// recomputes the account's scores in one patch, same as the manual path.
async function appendSignalToAccount(
  ctx: MutationCtx,
  account: Doc<"growthAccounts">,
  signal: Doc<"growthAccounts">["signals"][number],
) {
  const signals = [signal, ...account.signals];
  const scores = computeAccountScores({
    stage: account.stage,
    members: account.members,
    signals,
  });
  const members = recomputeMemberScores(account.members, scores.intentScore);
  await ctx.db.patch(account._id, {
    signals,
    members,
    ...scores,
    updatedAt: Date.now(),
  });
}

function toAccount(doc: Doc<"growthAccounts">) {
  return {
    id: doc._id,
    name: doc.name,
    domain: doc.domain,
    industry: doc.industry,
    employees: doc.employees,
    tier: doc.tier,
    stage: doc.stage,
    intentScore: doc.intentScore,
    engagementScore: doc.engagementScore,
    adoptionScore: doc.adoptionScore,
    buyingGroupCoverage: doc.buyingGroupCoverage,
    pipelineValue: doc.pipelineValue,
    ltv: doc.ltv,
    owner: doc.owner,
    nextAction: doc.nextAction,
    members: doc.members,
    signals: doc.signals,
    stageHistory: doc.stageHistory ?? [],
  };
}

export const listAccounts = query({
  handler: async (ctx) => {
    await requirePermission(ctx, "viewExecutiveAnalytics");
    const accounts = await ctx.db.query("growthAccounts").collect();
    return accounts.map(toAccount);
  },
});

export const getAccount = query({
  args: { accountId: v.id("growthAccounts") },
  handler: async (ctx, args) => {
    await requirePermission(ctx, "viewExecutiveAnalytics");
    const account = await ctx.db.get(args.accountId);
    return account ? toAccount(account) : null;
  },
});

// Real explanation of why an account's scores are what they are — every
// signal that contributed, computed live from the account's actual data,
// not a stored/stale summary.
export const getScoreBreakdown = query({
  args: { accountId: v.id("growthAccounts") },
  handler: async (ctx, args) => {
    await requirePermission(ctx, "viewExecutiveAnalytics");
    const account = await ctx.db.get(args.accountId);
    if (!account) return null;
    return computeScoreBreakdown({ members: account.members, signals: account.signals });
  },
});

// Leads are the individual buying-group members across every account,
// derived the same way the old static demo data computed them.
export const listLeads = query({
  handler: async (ctx) => {
    await requirePermission(ctx, "viewExecutiveAnalytics");
    const accounts = await ctx.db.query("growthAccounts").collect();
    return accounts.flatMap((account) =>
      account.members
        .filter((member) => member.status !== "missing")
        .map((member) => ({
          id: member.id,
          name: member.name,
          title: member.title,
          accountId: account._id,
          role: member.role,
          score: member.score,
          intent:
            member.score >= 80 ? "high" : member.score >= 60 ? "medium" : "low",
          source: account.signals[0]?.source ?? "crm",
          lastSignal: account.signals[0]?.kind ?? "campaignClick",
          nextAction: account.nextAction,
        })),
    );
  },
});

// No `score` here — a lead's score is always server-computed (see
// recomputeMemberScores above), never entered by whoever adds them.
const buyingMemberInput = v.object({
  id: v.string(),
  name: v.string(),
  title: v.string(),
  role: v.union(
    v.literal("decisionMaker"),
    v.literal("champion"),
    v.literal("user"),
    v.literal("technicalEvaluator"),
  ),
  email: v.string(),
  status: v.union(v.literal("active"), v.literal("missing"), v.literal("atRisk")),
});

const growthSignal = v.object({
  id: v.string(),
  source: v.union(
    v.literal("website"),
    v.literal("campaign"),
    v.literal("social"),
    v.literal("email"),
    v.literal("crm"),
    v.literal("product"),
    v.literal("support"),
  ),
  kind: v.union(
    v.literal("pricingVisit"),
    v.literal("socialQuestion"),
    v.literal("campaignClick"),
    v.literal("demoRequested"),
    v.literal("trialStarted"),
    v.literal("postCreated"),
    v.literal("productLogin"),
    v.literal("teamInvited"),
    v.literal("supportOpened"),
    v.literal("supportResolved"),
    v.literal("renewalViewed"),
  ),
  occurredAt: v.number(),
  detail: v.optional(v.string()),
  postId: v.optional(v.string()),
});

// A real benchmark for a brand-new account's pipeline/LTV, computed from
// what accounts of the same tier actually turned into once they became a
// real customer — not a guess. Falls back to every closed-won account
// (any tier) when there aren't enough same-tier data points yet, and
// returns null rather than a fabricated number when there's no closed-won
// history at all.
const MIN_SAME_TIER_SAMPLE = 3;

export const estimateOutcomes = query({
  args: {
    tier: v.union(
      v.literal("enterprise"),
      v.literal("midMarket"),
      v.literal("smallBusiness"),
    ),
  },
  handler: async (ctx, args) => {
    await requirePermission(ctx, "manageLeads");

    const accounts = await ctx.db.query("growthAccounts").collect();
    const closedWon = accounts.filter(
      (account) => account.stage === "customer" || account.stage === "renewal",
    );
    const sameTier = closedWon.filter((account) => account.tier === args.tier);
    const sample = sameTier.length >= MIN_SAME_TIER_SAMPLE ? sameTier : closedWon;
    if (sample.length === 0) return null;

    const avgPipeline = Math.round(
      sample.reduce((sum, account) => sum + account.pipelineValue, 0) / sample.length,
    );
    const avgLtv = Math.round(
      sample.reduce((sum, account) => sum + account.ltv, 0) / sample.length,
    );

    return {
      avgPipeline,
      avgLtv,
      sampleSize: sample.length,
      sameTier: sample === sameTier,
    };
  },
});

export const createAccount = mutation({
  args: {
    name: v.string(),
    domain: v.string(),
    industry: v.string(),
    employees: v.number(),
    tier: v.union(
      v.literal("enterprise"),
      v.literal("midMarket"),
      v.literal("smallBusiness"),
    ),
    stage: v.union(
      v.literal("discover"),
      v.literal("engaged"),
      v.literal("demo"),
      v.literal("trial"),
      v.literal("activated"),
      v.literal("customer"),
      v.literal("renewal"),
    ),
    owner: v.string(),
    pipelineValue: v.number(),
    ltv: v.number(),
  },
  handler: async (ctx, args) => {
    await requirePermission(ctx, "manageLeads");

    const scores = computeAccountScores({
      stage: args.stage,
      members: [],
      signals: [],
    });
    const now = Date.now();

    return await ctx.db.insert("growthAccounts", {
      ...args,
      ...scores,
      members: [],
      signals: [],
      stageHistory: [{ stage: args.stage, occurredAt: now }],
      createdAt: now,
      updatedAt: now,
    });
  },
});

// nextAction is deliberately not a settable arg here — it's derived from
// stage/signals/coverage by computeAccountScores below, so a manual value
// would just get overwritten on the next recompute anyway.
export const updateAccount = mutation({
  args: {
    accountId: v.id("growthAccounts"),
    stage: v.optional(
      v.union(
        v.literal("discover"),
        v.literal("engaged"),
        v.literal("demo"),
        v.literal("trial"),
        v.literal("activated"),
        v.literal("customer"),
        v.literal("renewal"),
      ),
    ),
    owner: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requirePermission(ctx, "manageLeads");

    const { accountId, ...patch } = args;
    const account = await ctx.db.get(accountId);
    if (!account) throw new Error("Account not found");

    const stage = patch.stage ?? account.stage;
    const scores = computeAccountScores({
      stage,
      members: account.members,
      signals: account.signals,
    });
    const members = recomputeMemberScores(account.members, scores.intentScore);
    const now = Date.now();
    const stageChanged = patch.stage !== undefined && patch.stage !== account.stage;
    const stageHistory = stageChanged
      ? [...(account.stageHistory ?? []), { stage, occurredAt: now }]
      : account.stageHistory;

    await ctx.db.patch(accountId, {
      ...patch,
      members,
      ...scores,
      ...(stageHistory ? { stageHistory } : {}),
      updatedAt: now,
    });
  },
});

export const addSignal = mutation({
  args: { accountId: v.id("growthAccounts"), signal: growthSignal },
  handler: async (ctx, args) => {
    await requirePermission(ctx, "manageLeads");

    const account = await ctx.db.get(args.accountId);
    if (!account) throw new Error("Account not found");

    const signals = [args.signal, ...account.signals];
    const scores = computeAccountScores({
      stage: account.stage,
      members: account.members,
      signals,
    });
    const members = recomputeMemberScores(account.members, scores.intentScore);

    await ctx.db.patch(args.accountId, {
      signals,
      members,
      ...scores,
      updatedAt: Date.now(),
    });
  },
});

export const addMember = mutation({
  args: { accountId: v.id("growthAccounts"), member: buyingMemberInput },
  handler: async (ctx, args) => {
    await requirePermission(ctx, "manageLeads");

    const account = await ctx.db.get(args.accountId);
    if (!account) throw new Error("Account not found");

    const membersBeforeScoring = [...account.members, { ...args.member, score: 0 }];
    const scores = computeAccountScores({
      stage: account.stage,
      members: membersBeforeScoring,
      signals: account.signals,
    });
    const members = recomputeMemberScores(membersBeforeScoring, scores.intentScore);

    await ctx.db.patch(args.accountId, {
      members,
      ...scores,
      updatedAt: Date.now(),
    });
  },
});

export const deleteAccount = mutation({
  args: { accountId: v.id("growthAccounts") },
  handler: async (ctx, args) => {
    await requirePermission(ctx, "manageLeads");
    await ctx.db.delete(args.accountId);
  },
});

// Auto-logs a real "product" signal on whichever growth account(s) share
// the given email's domain — this is what makes adoption scoring track
// actual product usage (a real sign-in, a real published post) instead of
// only moving when someone remembers to log a signal by hand. Internal
// only: called from team.ensureCurrentMember (login) and
// posts.recordPublishedPost (post created), never reachable from the
// client directly, so there's no permission check to bypass.
export const logProductSignal = internalMutation({
  args: {
    email: v.string(),
    kind: v.union(v.literal("postCreated"), v.literal("productLogin")),
  },
  handler: async (ctx, args) => {
    const domain = args.email.split("@")[1]?.toLowerCase().trim();
    if (!domain) return;

    const accounts = await ctx.db.query("growthAccounts").collect();
    const matches = accounts.filter(
      (account) => account.domain.toLowerCase().trim() === domain,
    );
    if (matches.length === 0) return;

    const now = Date.now();
    // Logins happen far more often than the underlying behavior actually
    // changes (every page load re-runs this) — cap it to once per 12h per
    // account so the signal reflects "they used it today," not "they had
    // the tab open." Post-creation has no such guard: publishing a post is
    // never accidental or rapid-fire, so each one is a genuine event.
    const loginCooldownMs = 12 * 60 * 60 * 1000;
    for (const account of matches) {
      if (args.kind === "productLogin") {
        const recentLogin = account.signals.find(
          (existing) =>
            existing.kind === "productLogin" &&
            now - existing.occurredAt < loginCooldownMs,
        );
        if (recentLogin) continue;
      }

      await appendSignalToAccount(ctx, account, {
        id: `${now}-${args.kind}-${Math.random().toString(36).slice(2, 8)}`,
        source: "product",
        kind: args.kind,
        occurredAt: now,
      });
    }
  },
});

// Best-effort intent signal from inbound social comments: if a commenter's
// display name matches a buying-group member's name on a tracked account,
// a Lead/Question-classified comment from them is logged as real intent.
// Honest limitation: name matching is approximate (nothing else in a
// social comment reliably ties back to a company — no email, no domain) —
// this will miss people whose social display name differs from what's on
// file, and could rarely mismatch on a common name shared by two people.
export const logSocialSignalForCommenter = internalMutation({
  args: {
    authorName: v.string(),
    classification: v.string(),
    content: v.string(),
  },
  handler: async (ctx, args) => {
    if (args.classification !== "Lead" && args.classification !== "Question") return;
    const name = args.authorName.trim().toLowerCase();
    if (!name) return;

    const accounts = await ctx.db.query("growthAccounts").collect();
    const matches = accounts.filter((account) =>
      account.members.some(
        (member) =>
          member.status !== "missing" && member.name.trim().toLowerCase() === name,
      ),
    );
    if (matches.length === 0) return;

    const now = Date.now();
    for (const account of matches) {
      await appendSignalToAccount(ctx, account, {
        id: `${now}-socialQuestion-${Math.random().toString(36).slice(2, 8)}`,
        source: "social",
        kind: "socialQuestion",
        occurredAt: now,
        detail: args.content.slice(0, 140),
      });
    }
  },
});
