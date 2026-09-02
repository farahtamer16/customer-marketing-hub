import { query, mutation } from "./_generated/server";
import type { QueryCtx } from "./_generated/server";
import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import { requirePermission } from "./authz";

const channel = v.union(
  v.literal("website"),
  v.literal("campaign"),
  v.literal("social"),
  v.literal("email"),
  v.literal("crm"),
  v.literal("product"),
  v.literal("support"),
);

// Real reach/impressions/engagement across a campaign's linked posts —
// each post's latest analytics snapshot, summed. Distinct from the
// account-side rollup: this is organic social performance, not pipeline.
async function computeSocialRollup(
  ctx: QueryCtx,
  postIds: Id<"posts">[] | undefined,
) {
  if (!postIds || postIds.length === 0) return null;

  const latestPerPost = await Promise.all(
    postIds.map((postId) =>
      ctx.db
        .query("analytics")
        .withIndex("by_postId", (q) => q.eq("postId", postId))
        .order("desc")
        .first(),
    ),
  );

  let reach = 0;
  let impressions = 0;
  let engagement = 0;
  let postsWithData = 0;
  for (const entry of latestPerPost) {
    if (!entry) continue;
    postsWithData += 1;
    reach += entry.reach ?? 0;
    impressions += entry.impressions ?? 0;
    engagement += entry.likes + entry.comments + (entry.shares ?? 0);
  }

  return { reach, impressions, engagement, postsLinked: postIds.length, postsWithData };
}

// accounts/opportunities/pipeline/customers/retained/ltv are rollups of the
// campaign's linked real growth accounts, computed here rather than typed
// in — a campaign's pipeline is just the sum of what its accounts are
// really worth, not a second, independent number someone has to keep in
// sync by hand. Campaigns with no linked accounts yet fall back to
// whatever was last stored (0 for a brand new one). socialReach/
// socialImpressions/socialEngagement work the same way from linked posts.
export const listCampaigns = query({
  handler: async (ctx) => {
    await requirePermission(ctx, "viewExecutiveAnalytics");
    const campaigns = await ctx.db.query("campaigns").collect();
    return await Promise.all(
      campaigns.map(async (campaign) => {
        const social = await computeSocialRollup(ctx, campaign.postIds);
        const socialFields = social
          ? {
              socialReach: social.reach,
              socialImpressions: social.impressions,
              socialEngagement: social.engagement,
              postsWithData: social.postsWithData,
            }
          : {};

        if (!campaign.accountIds || campaign.accountIds.length === 0) {
          return { id: campaign._id, ...campaign, ...socialFields };
        }

        const linkedAccounts = (
          await Promise.all(campaign.accountIds.map((id) => ctx.db.get(id)))
        ).filter((account) => account !== null);

        const opportunities = linkedAccounts.filter(
          (account) => account.stage !== "discover",
        ).length;
        const customers = linkedAccounts.filter(
          (account) => account.stage === "customer" || account.stage === "renewal",
        ).length;
        const retained = linkedAccounts.filter(
          (account) => account.stage === "renewal",
        ).length;
        const pipeline = linkedAccounts.reduce(
          (sum, account) => sum + account.pipelineValue,
          0,
        );
        const ltv = linkedAccounts.reduce((sum, account) => sum + account.ltv, 0);

        return {
          id: campaign._id,
          ...campaign,
          ...socialFields,
          accounts: linkedAccounts.length,
          opportunities,
          pipeline,
          customers,
          retained,
          ltv,
        };
      }),
    );
  },
});

export const createCampaign = mutation({
  args: {
    name: v.string(),
    channel,
    spend: v.number(),
    accountIds: v.optional(v.array(v.id("growthAccounts"))),
    postIds: v.optional(v.array(v.id("posts"))),
  },
  handler: async (ctx, args) => {
    await requirePermission(ctx, "manageCampaigns");
    return await ctx.db.insert("campaigns", {
      ...args,
      // Placeholders — listCampaigns computes the real values from
      // accountIds/postIds whenever any are linked.
      accounts: 0,
      opportunities: 0,
      pipeline: 0,
      customers: 0,
      retained: 0,
      ltv: 0,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
  },
});

export const updateCampaign = mutation({
  args: {
    campaignId: v.id("campaigns"),
    name: v.optional(v.string()),
    channel: v.optional(channel),
    spend: v.optional(v.number()),
    accountIds: v.optional(v.array(v.id("growthAccounts"))),
    postIds: v.optional(v.array(v.id("posts"))),
  },
  handler: async (ctx, args) => {
    await requirePermission(ctx, "manageCampaigns");
    const { campaignId, ...patch } = args;
    await ctx.db.patch(campaignId, { ...patch, updatedAt: Date.now() });
  },
});

export const deleteCampaign = mutation({
  args: { campaignId: v.id("campaigns") },
  handler: async (ctx, args) => {
    await requirePermission(ctx, "manageCampaigns");
    await ctx.db.delete(args.campaignId);
  },
});
