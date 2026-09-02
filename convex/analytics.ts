// convex/analytics.ts
import { query, internalMutation } from "./_generated/server";
import { v } from "convex/values";

// ── Get the most recent analytics entry for a post ─────────────────
export const getLatestForPost = query({
  args: { postId: v.id("posts") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("analytics")
      .withIndex("by_postId", (q) => q.eq("postId", args.postId))
      .order("desc")
      .first();
  },
});

// ── Record a new analytics entry ────────────────────────────────────
// Only ever called from meta.ts's fetchPostAnalytics, after it has already
// verified the caller owns the post.
export const recordAnalytics = internalMutation({
  args: {
    postId: v.id("posts"),
    userId: v.string(),
    platform: v.string(),
    likes: v.number(),
    comments: v.number(),
    shares: v.optional(v.number()),
    reach: v.optional(v.number()),
    impressions: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const id = await ctx.db.insert("analytics", {
      postId: args.postId,
      userId: args.userId,
      platform: args.platform,
      likes: args.likes,
      comments: args.comments,
      shares: args.shares ?? 0,
      reach: args.reach,
      impressions: args.impressions,
      scrapedAt: Date.now(),
      createdAt: Date.now(),
    });
    return id;
  },
});

// ── Dashboard overview (totals, averages, latest) ──────────────────
// Identity is derived from the caller's own session, never trusted from an
// argument — otherwise anyone signed in could read another teammate's
// engagement numbers by passing their userId.
export const getOverview = query({
  args: {
    platform: v.optional(v.string()),
    days: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return {
        totalLikes: 0,
        totalComments: 0,
        totalShares: 0,
        totalReach: 0,
        totalImpressions: 0,
        avgLikes: 0,
        avgComments: 0,
        avgShares: 0,
        avgEngagementRate: null,
        totalPosts: 0,
        latest: null,
      };
    }

    const { platform, days } = args;
    const since = days ? Date.now() - days * 24 * 60 * 60 * 1000 : 0;

    const analytics = await ctx.db
      .query("analytics")
      .withIndex("by_userId", (q) => q.eq("userId", identity.subject))
      .filter((q) => q.gte(q.field("scrapedAt"), since))
      .collect();

    const filtered = platform
      ? analytics.filter((a) => a.platform === platform)
      : analytics;

    let totalLikes = 0,
      totalComments = 0,
      totalShares = 0,
      totalReach = 0,
      totalImpressions = 0;
    // Engagement rate needs a reach denominator, which not every entry has
    // (insights can fail independently of likes/comments/shares) — average
    // only over entries that actually reported reach, rather than treating
    // a missing reach as zero and understating the rate.
    let engagementRateSum = 0;
    let entriesWithReach = 0;
    for (const a of filtered) {
      totalLikes += a.likes;
      totalComments += a.comments;
      totalShares += a.shares ?? 0;
      totalReach += a.reach ?? 0;
      totalImpressions += a.impressions ?? 0;
      if (a.reach && a.reach > 0) {
        entriesWithReach += 1;
        engagementRateSum += (a.likes + a.comments + (a.shares ?? 0)) / a.reach;
      }
    }

    const count = filtered.length;
    const avgLikes = count ? Math.round(totalLikes / count) : 0;
    const avgComments = count ? Math.round(totalComments / count) : 0;
    const avgShares = count ? Math.round(totalShares / count) : 0;
    const avgEngagementRate = entriesWithReach
      ? engagementRateSum / entriesWithReach
      : null;

    const latest = filtered.length ? filtered.reduce((a, b) => (a.scrapedAt > b.scrapedAt ? a : b)) : null;

    return {
      totalLikes,
      totalComments,
      totalShares,
      totalReach,
      totalImpressions,
      avgLikes,
      avgComments,
      avgShares,
      avgEngagementRate,
      totalPosts: count,
      latest,
    };
  },
});

// ── Get all posts with their latest analytics (for list view) ────
export const getPostsWithAnalytics = query({
  args: {
    platform: v.optional(v.string()),
    status: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return { data: [], count: 0 };

    const { platform, status } = args;

    const posts = await ctx.db
      .query("posts")
      .withIndex("by_userId", (q) => q.eq("userId", identity.subject))
      .collect();

    let filtered = posts;
    if (platform) filtered = filtered.filter((p) => p.platform === platform);
    if (status) filtered = filtered.filter((p) => p.status === status);

    const result = [];
    for (const post of filtered) {
      const latest = await ctx.db
        .query("analytics")
        .withIndex("by_postId", (q) => q.eq("postId", post._id))
        .order("desc")
        .first();
      result.push({ post, analytics: latest || null });
    }

    // Sort by publishedAt descending (newest first)
    result.sort((a, b) => (b.post.publishedAt || 0) - (a.post.publishedAt || 0));

    return { data: result, count: result.length };
  },
});
