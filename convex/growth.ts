import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import type { Doc } from "./_generated/dataModel";
import { requirePermission } from "./authz";
import { computeAccountScores } from "./scoring";

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
    const accounts = await ctx.db.query("growthAccounts").collect();
    return accounts.map(toAccount);
  },
});

export const getAccount = query({
  args: { accountId: v.id("growthAccounts") },
  handler: async (ctx, args) => {
    const account = await ctx.db.get(args.accountId);
    return account ? toAccount(account) : null;
  },
});

// Leads are the individual buying-group members across every account,
// derived the same way the old static demo data computed them.
export const listLeads = query({
  handler: async (ctx) => {
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

const buyingMember = v.object({
  id: v.string(),
  name: v.string(),
  title: v.string(),
  role: v.union(
    v.literal("decisionMaker"),
    v.literal("champion"),
    v.literal("user"),
    v.literal("technicalEvaluator"),
  ),
  score: v.number(),
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
    v.literal("teamInvited"),
    v.literal("supportOpened"),
    v.literal("supportResolved"),
    v.literal("renewalViewed"),
  ),
  occurredAt: v.number(),
  detail: v.optional(v.string()),
  postId: v.optional(v.string()),
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
    const now = Date.now();
    const stageChanged = patch.stage !== undefined && patch.stage !== account.stage;
    const stageHistory = stageChanged
      ? [...(account.stageHistory ?? []), { stage, occurredAt: now }]
      : account.stageHistory;

    await ctx.db.patch(accountId, {
      ...patch,
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

    await ctx.db.patch(args.accountId, {
      signals,
      ...scores,
      updatedAt: Date.now(),
    });
  },
});

export const addMember = mutation({
  args: { accountId: v.id("growthAccounts"), member: buyingMember },
  handler: async (ctx, args) => {
    await requirePermission(ctx, "manageLeads");

    const account = await ctx.db.get(args.accountId);
    if (!account) throw new Error("Account not found");

    const members = [...account.members, args.member];
    const scores = computeAccountScores({
      stage: account.stage,
      members,
      signals: account.signals,
    });

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
