import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// visitorId is a browser-generated id (see hooks/useVisitorId.ts), stored
// in localStorage on the public landing page — this is anonymous tracking
// before anyone has signed in, so there's no Clerk identity to key off yet.
export const recordVisit = mutation({
  args: { visitorId: v.string() },
  handler: async (ctx, args) => {
    const now = Date.now();
    const existing = await ctx.db
      .query("consumerVisitors")
      .withIndex("by_visitorId", (q) => q.eq("visitorId", args.visitorId))
      .unique();
    if (existing) {
      await ctx.db.patch(existing._id, { lastSeenAt: now });
      return;
    }
    await ctx.db.insert("consumerVisitors", {
      visitorId: args.visitorId,
      firstSeenAt: now,
      lastSeenAt: now,
    });
  },
});

// Fired when a visitor takes a real step toward converting (clicking
// through to sign up or sign in) — not a scroll/time-on-page heuristic,
// an actual intent action.
export const recordEngagement = mutation({
  args: { visitorId: v.string() },
  handler: async (ctx, args) => {
    const now = Date.now();
    const existing = await ctx.db
      .query("consumerVisitors")
      .withIndex("by_visitorId", (q) => q.eq("visitorId", args.visitorId))
      .unique();
    if (existing) {
      await ctx.db.patch(existing._id, {
        lastSeenAt: now,
        engagedAt: existing.engagedAt ?? now,
      });
      return;
    }
    await ctx.db.insert("consumerVisitors", {
      visitorId: args.visitorId,
      firstSeenAt: now,
      lastSeenAt: now,
      engagedAt: now,
    });
  },
});

// Called once, right after a real Clerk sign-up/sign-in, to link the
// anonymous visitor row to the now-authenticated user. Identity is derived
// from the caller's own session, not trusted from the client — the
// visitorId alone can't impersonate anyone since it only ever links to
// whoever is actually signed in when this runs.
export const linkSignup = mutation({
  args: { visitorId: v.string() },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return;
    const now = Date.now();
    const existing = await ctx.db
      .query("consumerVisitors")
      .withIndex("by_visitorId", (q) => q.eq("visitorId", args.visitorId))
      .unique();
    if (existing) {
      if (existing.signedUpAt) return;
      await ctx.db.patch(existing._id, {
        clerkUserId: identity.subject,
        signedUpAt: now,
        lastSeenAt: now,
      });
      return;
    }
    await ctx.db.insert("consumerVisitors", {
      visitorId: args.visitorId,
      firstSeenAt: now,
      lastSeenAt: now,
      clerkUserId: identity.subject,
      signedUpAt: now,
    });
  },
});

// Each visitor is bucketed into the furthest stage they've genuinely
// reached — activation and retention aren't stored flags, they're read
// straight off real published-post counts so they can't drift out of sync
// with what actually happened.
export const listFunnel = query({
  handler: async (ctx) => {
    const visitors = await ctx.db.query("consumerVisitors").collect();
    const posts = await ctx.db.query("posts").collect();
    const publishedCountByUser = new Map<string, number>();
    for (const post of posts) {
      if (post.status !== "Published") continue;
      publishedCountByUser.set(
        post.userId,
        (publishedCountByUser.get(post.userId) ?? 0) + 1,
      );
    }

    const counts = {
      firstVisit: 0,
      contentEngaged: 0,
      signedUp: 0,
      activated: 0,
      retained: 0,
    };

    for (const visitor of visitors) {
      const publishedCount = visitor.clerkUserId
        ? (publishedCountByUser.get(visitor.clerkUserId) ?? 0)
        : 0;
      if (publishedCount >= 3) counts.retained += 1;
      else if (publishedCount >= 1) counts.activated += 1;
      else if (visitor.signedUpAt) counts.signedUp += 1;
      else if (visitor.engagedAt) counts.contentEngaged += 1;
      else counts.firstVisit += 1;
    }

    return counts;
  },
});
