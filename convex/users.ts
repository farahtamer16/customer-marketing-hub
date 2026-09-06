import { internalMutation, mutation, query } from "./_generated/server";
import { v } from "convex/values";

// Drives whether vendor-only UI (the consumer landing-page funnel in
// Growth Hub's Journeys page) even renders for the current caller.
// `false` for a signed-out visitor rather than an error, since this is
// used to decide what to show, not to gate an actual read of the data.
export const amIVendorAdmin = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return false;
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkUserId", (q) => q.eq("clerkUserId", identity.subject))
      .unique();
    return Boolean(user?.isVendorAdmin);
  },
});

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

// One-off backfill for rows created before getOrCreate started writing
// email/name — sources them from the same person's teamMembers record
// (matched by clerkUserId), which has always stored real values. Only
// fills fields that are actually missing; never overwrites. Internal —
// meant to be run once via `npx convex run users:backfillEmailAndName`,
// not reachable from the client.
export const backfillEmailAndName = internalMutation({
  args: {},
  handler: async (ctx) => {
    const users = await ctx.db.query("users").collect();
    let updated = 0;
    let skipped = 0;
    for (const user of users) {
      if (user.email && user.name) continue;
      const member = await ctx.db
        .query("teamMembers")
        .withIndex("by_clerkUserId", (q) => q.eq("clerkUserId", user.clerkUserId))
        .unique();
      if (!member) {
        skipped += 1;
        continue;
      }
      await ctx.db.patch(user._id, {
        email: user.email ?? member.email,
        name: user.name ?? member.name,
      });
      updated += 1;
    }
    return { total: users.length, updated, skipped };
  },
});

// Bootstraps vendor-admin access for a real person by email — no caller
// permission check, since the very first grant has no existing vendor
// admin to authorize it. Safe because it's internal-only: reachable
// exclusively via `npx convex run users:grantVendorAdmin '{"email":"..."}'`,
// which already requires full deployment access, never from the client.
// The person needs a users row already (i.e. has signed in at least once).
export const grantVendorAdmin = internalMutation({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    const email = args.email.trim().toLowerCase();
    const user = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("email"), email))
      .first();
    if (!user) {
      throw new Error(
        `No users row for ${email} yet — they need to sign in at least once first.`,
      );
    }
    await ctx.db.patch(user._id, { isVendorAdmin: true });
    return { userId: user._id };
  },
});

export const revokeVendorAdmin = internalMutation({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    const email = args.email.trim().toLowerCase();
    const user = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("email"), email))
      .first();
    if (!user) throw new Error(`No users row for ${email}`);
    await ctx.db.patch(user._id, { isVendorAdmin: false });
    return { userId: user._id };
  },
});