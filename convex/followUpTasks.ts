import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { requireMember } from "./authz";

// Every function here used to trust a client-supplied id directly with no
// identity check at all — closed as part of the multi-tenancy migration,
// since these ids (a users-table id, a workspace) become real tenant
// boundaries once more than one workspace exists. The frontend already
// only ever asked for its own tasks (via api.users.current), so this
// tightens the backend to match what callers already do rather than
// changing behavior.

export const createFollowUpTask = mutation({
  args: {
    commentId: v.id("comments"),
    title: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    const actor = await requireMember(ctx);

    const selfUser = await ctx.db
      .query("users")
      .withIndex("by_clerkUserId", (q) => q.eq("clerkUserId", identity.subject))
      .unique();
    if (!selfUser) throw new Error("User record not found");

    return await ctx.db.insert("followUpTasks", {
      commentId: args.commentId,
      userId: selfUser._id,
      workspaceId: actor.workspaceId,
      title: args.title,
      status: "Todo",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
  },
});

export const updateTaskStatus = mutation({
  args: {
    taskId: v.id("followUpTasks"),
    status: v.union(v.literal("Todo"), v.literal("InProgress"), v.literal("Completed")),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const task = await ctx.db.get(args.taskId);
    if (!task) throw new Error("Task not found");

    const selfUser = await ctx.db
      .query("users")
      .withIndex("by_clerkUserId", (q) => q.eq("clerkUserId", identity.subject))
      .unique();
    if (!selfUser || task.userId !== selfUser._id) {
      throw new Error("You can only manage your own tasks");
    }

    await ctx.db.patch(args.taskId, {
      status: args.status,
      updatedAt: Date.now(),
    });
  },
});

// Identity-derived — no userId argument to spoof, matches the pattern
// used everywhere else in this app (posts.getPostsForUser, etc.).
export const getTasksForUser = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    const selfUser = await ctx.db
      .query("users")
      .withIndex("by_clerkUserId", (q) => q.eq("clerkUserId", identity.subject))
      .unique();
    if (!selfUser) return [];

    return await ctx.db
      .query("followUpTasks")
      .withIndex("by_userId", (q) => q.eq("userId", selfUser._id))
      .collect();
  },
});

export const getTasksForComment = query({
  args: { commentId: v.id("comments") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    const comment = await ctx.db.get(args.commentId);
    if (!comment || comment.userId !== identity.subject) return [];

    return await ctx.db
      .query("followUpTasks")
      .withIndex("by_commentId", (q) => q.eq("commentId", args.commentId))
      .collect();
  },
});
