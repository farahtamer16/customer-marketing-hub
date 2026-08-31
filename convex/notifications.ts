import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const listNotifications = query({
  handler: async (ctx) => {
    const notifications = await ctx.db
      .query("workspaceNotifications")
      .withIndex("by_occurredAt")
      .order("desc")
      .collect();
    return notifications.map((n) => ({ id: n._id, ...n }));
  },
});

export const markRead = mutation({
  args: { notificationId: v.id("workspaceNotifications") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.notificationId, { read: true });
  },
});

export const markAllRead = mutation({
  handler: async (ctx) => {
    const notifications = await ctx.db
      .query("workspaceNotifications")
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
    return await ctx.db.insert("workspaceNotifications", {
      ...args,
      occurredAt: Date.now(),
      read: false,
    });
  },
});
