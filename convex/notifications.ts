import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { requireInWorkspace, requireMember } from "./authz";

// Any workspace member can see their own workspace's activity feed — same
// membership-only gate as approvals.listPosts, not a specific permission.
export const listNotifications = query({
  handler: async (ctx) => {
    const actor = await requireMember(ctx);
    const notifications = await ctx.db
      .query("workspaceNotifications")
      .withIndex("by_workspaceId_occurredAt", (q) => q.eq("workspaceId", actor.workspaceId))
      .order("desc")
      .collect();
    return notifications.map((n) => ({ id: n._id, ...n }));
  },
});

export const markRead = mutation({
  args: { notificationId: v.id("workspaceNotifications") },
  handler: async (ctx, args) => {
    const actor = await requireMember(ctx);
    const notification = await ctx.db.get(args.notificationId);
    if (!notification) throw new Error("Notification not found");
    requireInWorkspace(actor, notification);
    await ctx.db.patch(args.notificationId, { read: true });
  },
});

export const markAllRead = mutation({
  handler: async (ctx) => {
    const actor = await requireMember(ctx);
    const notifications = await ctx.db
      .query("workspaceNotifications")
      .withIndex("by_workspaceId_occurredAt", (q) => q.eq("workspaceId", actor.workspaceId))
      .filter((q) => q.eq(q.field("read"), false))
      .collect();
    for (const notification of notifications) {
      await ctx.db.patch(notification._id, { read: true });
    }
  },
});

export const createNotification = mutation({
  args: {
    kind: v.union(
      v.literal("approval"),
      v.literal("signal"),
      v.literal("support"),
      v.literal("system"),
    ),
    title: v.string(),
    detail: v.string(),
    href: v.string(),
  },
  handler: async (ctx, args) => {
    const actor = await requireMember(ctx);
    return await ctx.db.insert("workspaceNotifications", {
      ...args,
      workspaceId: actor.workspaceId,
      occurredAt: Date.now(),
      read: false,
    });
  },
});
