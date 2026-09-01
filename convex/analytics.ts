// convex/analytics.ts
import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

// ── Get all analytics for a specific post ──────────────────────────
export const getPostAnalytics = query({
  args: { postId: v.id("posts") },
  handler: async (ctx, args) => {
    const docs = await ctx.db
      .query("analytics")
      .withIndex("by_postId", (q) => q.eq("postId", args.postId))
      .order("desc")
      .collect();
    return { data: docs, count: docs.length };
  },
});

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
export const recordAnalytics = mutation({
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
export const getOverview = query({
  args: {
    userId: v.string(),
    platform: v.optional(v.string()),
    days: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { userId, platform, days } = args;
    const since = days ? Date.now() - days * 24 * 60 * 60 * 1000 : 0;

    // Get all analytics for this user within the time window
    const analytics = await ctx.db
      .query("analytics")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .filter((q) => q.gte(q.field("scrapedAt"), since))
      .collect();

    // Filter by platform if provided
    const filtered = platform
      ? analytics.filter((a) => a.platform === platform)
      : analytics;

    // Compute totals
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

    // Get the most recent scraped entry (overall)
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

// ── Timeline data for charts ──────────────────────────────────────
export const getTimeline = query({
  args: {
    userId: v.string(),
    platform: v.optional(v.string()),
    days: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { userId, platform, days } = args;
    const since = days ? Date.now() - days * 24 * 60 * 60 * 1000 : 0;

    const analytics = await ctx.db
      .query("analytics")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .filter((q) => q.gte(q.field("scrapedAt"), since))
      .collect();

    const filtered = platform
      ? analytics.filter((a) => a.platform === platform)
      : analytics;

    // Group by day
    const map = new Map<string, { likes: number; comments: number; shares: number }>();
    for (const a of filtered) {
      const date = new Date(a.scrapedAt).toISOString().split("T")[0];
      const existing = map.get(date) || { likes: 0, comments: 0, shares: 0 };
      existing.likes += a.likes;
      existing.comments += a.comments;
      existing.shares += a.shares ?? 0;
      map.set(date, existing);
    }

    const timeline = Array.from(map.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([date, metrics]) => ({ date, ...metrics }));

    return timeline;
  },
});

// ── Top posts by total engagement ──────────────────────────────────
export const getTopPosts = query({
  args: {
    userId: v.string(),
    platform: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { userId, platform, limit = 10 } = args;

    // Get all posts for this user (with analytics)
    const posts = await ctx.db
      .query("posts")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .filter((q) => q.eq(q.field("status"), "Published"))
      .collect();

    const platformFiltered = platform
      ? posts.filter((p) => p.platform === platform)
      : posts;

    // For each post, get its latest analytics
    const result = [];
    for (const post of platformFiltered) {
      if (!post.postUrl) continue;
      const latest = await ctx.db
        .query("analytics")
        .withIndex("by_postId", (q) => q.eq("postId", post._id))
        .order("desc")
        .first();
      if (latest) {
        const engagement = latest.likes + latest.comments + (latest.shares ?? 0);
        result.push({
          post,
          analytics: latest,
          engagement,
        });
      }
    }

    // Sort by engagement descending and limit
    result.sort((a, b) => b.engagement - a.engagement);
    return result.slice(0, limit);
  },
});

// ── Get all posts with their latest analytics (for list view) ────
export const getPostsWithAnalytics = query({
  args: {
    userId: v.string(),
    platform: v.optional(v.string()),
    status: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { userId, platform, status } = args;

    const posts = await ctx.db
      .query("posts")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
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