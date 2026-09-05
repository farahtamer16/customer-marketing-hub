import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const current = query({
  args: {},

  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();

    if (!identity) {
      return null;
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkUserId", (q) =>
        q.eq("clerkUserId", identity.subject),
      )
      .unique();

    return user;
  },
});
 
export const getOrCreate = mutation({
  args: {},

  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const clerkUserId = identity.subject;

    const existingUser = await ctx.db
      .query("users")
      .withIndex("by_clerkUserId", (q) =>
        q.eq("clerkUserId", clerkUserId),
      )
      .unique();

    if (existingUser) {
      return existingUser;
    }

    const userId = await ctx.db.insert("users", {
      clerkUserId,
      email: identity.email,
      name: identity.name,
      createdAt: Date.now(),
    });

    return await ctx.db.get(userId);
  },
});