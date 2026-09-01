import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { requirePermission } from "./authz";

export const listSteps = query({
  handler: async (ctx) => {
    const steps = await ctx.db.query("journeySteps").collect();
    return steps.map((step) => ({
      stage: step.stage,
      owner: step.owner,
      completed: step.completed,
    }));
  },
});

export const setStepCompleted = mutation({
  args: {
    stage: v.union(
      v.literal("workspaceCreated"),
      v.literal("dataConnected"),
      v.literal("teamInvited"),
      v.literal("permissionsAssigned"),
      v.literal("firstCampaign"),
      v.literal("growthOperations"),
    ),
    completed: v.boolean(),
  },
  handler: async (ctx, args) => {
    await requirePermission(ctx, "manageWorkspace");
    const step = await ctx.db
      .query("journeySteps")
      .withIndex("by_stage", (q) => q.eq("stage", args.stage))
      .unique();
    if (!step) throw new Error("Journey step not found");
    await ctx.db.patch(step._id, {
      completed: args.completed,
      updatedAt: Date.now(),
    });
  },
});
