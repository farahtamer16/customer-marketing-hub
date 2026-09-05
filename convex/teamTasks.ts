import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { requireMember, requirePermission } from "./authz";

const status = v.union(
  v.literal("Todo"),
  v.literal("InProgress"),
  v.literal("Completed"),
);

// An admin hands a concrete task to a whole team — distinct from the
// per-comment followUpTasks a person picks up individually.
export const createTeamTask = mutation({
  args: {
    teamId: v.id("teams"),
    title: v.string(),
    description: v.optional(v.string()),
    dueAt: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const actor = await requirePermission(ctx, "manageTeam");
    const title = args.title.trim();
    if (!title) throw new Error("Task title is required");
    return await ctx.db.insert("teamTasks", {
      teamId: args.teamId,
      title,
      description: args.description?.trim() || undefined,
      status: "Todo",
      assignedBy: actor.name,
      dueAt: args.dueAt,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
  },
});

export const listTasksForTeam = query({
  args: { teamId: v.id("teams") },
  handler: async (ctx, args) => {
    await requirePermission(ctx, "manageTeam");
    return await ctx.db
      .query("teamTasks")
      .withIndex("by_teamId", (q) => q.eq("teamId", args.teamId))
      .collect();
  },
});

// Every task for the caller's own team — so a member with no manageTeam
// permission can still see what their team was actually assigned, not just
// admins.
export const listMyTeamTasks = query({
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];
    const member = await ctx.db
      .query("teamMembers")
      .withIndex("by_clerkUserId", (q) => q.eq("clerkUserId", identity.subject))
      .unique();
    const teamId = member?.teamId;
    if (!teamId) return [];
    return await ctx.db
      .query("teamTasks")
      .withIndex("by_teamId", (q) => q.eq("teamId", teamId))
      .collect();
  },
});

// Any member of the task's own team can move it along — not just an admin
// — since the whole point is the team working the task, not the admin
// doing data entry on their behalf. requireMember still ensures only a
// real workspace member (of the right team) can touch it.
export const updateTeamTaskStatus = mutation({
  args: { taskId: v.id("teamTasks"), status },
  handler: async (ctx, args) => {
    const member = await requireMember(ctx);
    const task = await ctx.db.get(args.taskId);
    if (!task) throw new Error("Task not found");
    const canManage = member.role === "ownerAdmin";
    if (!canManage && member.teamId !== task.teamId) {
      throw new Error("This task belongs to a different team");
    }
    await ctx.db.patch(args.taskId, { status: args.status, updatedAt: Date.now() });
  },
});

export const deleteTeamTask = mutation({
  args: { taskId: v.id("teamTasks") },
  handler: async (ctx, args) => {
    await requirePermission(ctx, "manageTeam");
    await ctx.db.delete(args.taskId);
  },
});
