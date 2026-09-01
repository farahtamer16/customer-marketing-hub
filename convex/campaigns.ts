import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
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

// accounts/opportunities/pipeline/customers/retained/ltv are rollups of the
// campaign's linked real growth accounts, computed here rather than typed
// in — a campaign's pipeline is just the sum of what its accounts are
// really worth, not a second, independent number someone has to keep in
// sync by hand. Campaigns with no linked accounts yet fall back to
// whatever was last stored (0 for a brand new one).
export const listCampaigns = query({
  handler: async (ctx) => {
    const campaigns = await ctx.db.query("campaigns").collect();
    return await Promise.all(
      campaigns.map(async (campaign) => {
        if (!campaign.accountIds || campaign.accountIds.length === 0) {
          return { id: campaign._id, ...campaign };
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
  },
  handler: async (ctx, args) => {
    await requirePermission(ctx, "manageCampaigns");
    return await ctx.db.insert("campaigns", {
      ...args,
      // Placeholders — listCampaigns computes the real values from
      // accountIds whenever any are linked.
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
    spend: v.optional(v.number()),
    accountIds: v.optional(v.array(v.id("growthAccounts"))),
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
