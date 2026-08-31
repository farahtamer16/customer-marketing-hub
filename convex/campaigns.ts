import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

const channel = v.union(
  v.literal("website"),
  v.literal("campaign"),
  v.literal("social"),
  v.literal("email"),
  v.literal("crm"),
  v.literal("product"),
  v.literal("support"),
);

export const listCampaigns = query({
  handler: async (ctx) => {
    const campaigns = await ctx.db.query("campaigns").collect();
    return campaigns.map((campaign) => ({ id: campaign._id, ...campaign }));
  },
});

export const createCampaign = mutation({
  args: {
    name: v.string(),
    channel,
    spend: v.number(),
    accounts: v.number(),
    opportunities: v.number(),
    pipeline: v.number(),
    customers: v.number(),
    retained: v.number(),
    ltv: v.number(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("campaigns", {
      ...args,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
  },
});

export const updateCampaign = mutation({
  args: {
    campaignId: v.id("campaigns"),
    spend: v.optional(v.number()),
    accounts: v.optional(v.number()),
    opportunities: v.optional(v.number()),
    pipeline: v.optional(v.number()),
    customers: v.optional(v.number()),
    retained: v.optional(v.number()),
    ltv: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { campaignId, ...patch } = args;
    await ctx.db.patch(campaignId, { ...patch, updatedAt: Date.now() });
  },
});

export const deleteCampaign = mutation({
  args: { campaignId: v.id("campaigns") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.campaignId);
  },
});
