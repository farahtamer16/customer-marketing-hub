import { query, mutation, internalQuery } from "./_generated/server";
import { v } from "convex/values";

// Public-safe projection: never expose accessToken or the raw platform
// account id to the client.
function toPublicAccount(doc: {
  _id: string;
  userId?: string;
  platform: string;
  accountName: string;
  accountHandle: string;
  status: string;
  createdAt: number;
  platformAccountId?: string;
}) {
  return {
    _id: doc._id,
    userId: doc.userId,
    platform: doc.platform,
    accountName: doc.accountName,
    accountHandle: doc.accountHandle,
    status: doc.status,
    createdAt: doc.createdAt,
    isMetaConnected: Boolean(doc.platformAccountId),
  };
}

// Identity is derived from the caller's own session, never trusted from an
// argument — otherwise any signed-in user could pass another teammate's id
// and read (or, in disconnectAccount below, delete) their real Meta
// connection.
export const getAccountsForUser = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];
    const accounts = await ctx.db
      .query("socialAccounts")
      .withIndex("by_userId", (q) => q.eq("userId", identity.subject))
      .collect();
    return accounts.map(toPublicAccount);
  },
});

export const disconnectAccount = mutation({
  args: {
    platform: v.union(
      v.literal("Instagram"),
      v.literal("Facebook"),
      v.literal("LinkedIn"),
      v.literal("TikTok"),
      v.literal("X"),
    ),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    const existing = await ctx.db
      .query("socialAccounts")
      .withIndex("by_userId_platform", (q) =>
        q.eq("userId", identity.subject).eq("platform", args.platform),
      )
      .first();
    if (existing) {
      await ctx.db.delete(existing._id);
    }
  },
});

// Called from the Meta OAuth callback route (via convex/nextjs's
// fetchMutation with the caller's Clerk token) to store a Facebook Page
// (and, when linked, its Instagram Business Account) connection. The
// userId is taken from the authenticated identity, never from an argument,
// so the callback route can't be tricked into writing another user's tokens.
export const connectMetaAccount = mutation({
  args: {
    platform: v.union(v.literal("Facebook"), v.literal("Instagram")),
    accountName: v.string(),
    accountHandle: v.string(),
    platformAccountId: v.string(),
    accessToken: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    const userId = identity.subject;

    const existing = await ctx.db
      .query("socialAccounts")
      .withIndex("by_userId_platform", (q) =>
        q.eq("userId", userId).eq("platform", args.platform),
      )
      .first();
    const patch = {
      accountName: args.accountName,
      accountHandle: args.accountHandle,
      status: "Connected" as const,
      platformAccountId: args.platformAccountId,
      accessToken: args.accessToken,
      tokenObtainedAt: Date.now(),
    };
    if (existing) {
      await ctx.db.patch(existing._id, patch);
      return existing._id;
    }
    return await ctx.db.insert("socialAccounts", {
      userId,
      platform: args.platform,
      createdAt: Date.now(),
      ...patch,
    });
  },
});

// Internal-only: fetches the Meta credentials needed to call the Graph API.
// Never exposed to the client — used by convex/meta.ts actions.
export const getMetaCredentials = internalQuery({
  args: {
    userId: v.string(),
    platform: v.union(v.literal("Facebook"), v.literal("Instagram")),
  },
  handler: async (ctx, args) => {
    const account = await ctx.db
      .query("socialAccounts")
      .withIndex("by_userId_platform", (q) =>
        q.eq("userId", args.userId).eq("platform", args.platform),
      )
      .first();
    if (!account || !account.platformAccountId || !account.accessToken) {
      return null;
    }
    return {
      platformAccountId: account.platformAccountId,
      accessToken: account.accessToken,
    };
  },
});
