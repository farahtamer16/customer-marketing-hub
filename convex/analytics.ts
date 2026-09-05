// convex/analytics.ts
import { query, internalMutation } from "./_generated/server";
import type { QueryCtx } from "./_generated/server";
import { v } from "convex/values";
import type { Doc, Id } from "./_generated/dataModel";
import { requirePermission } from "./authz";

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

const EMPTY_OVERVIEW = {
  totalLikes: 0,
  totalComments: 0,
  totalShares: 0,
  totalReach: 0,
  totalImpressions: 0,
  avgLikes: 0,
  avgComments: 0,
  avgShares: 0,
  avgEngagementRate: null as number | null,
  totalPosts: 0,
  latest: null as Doc<"analytics"> | null,
};

async function fetchAnalyticsRows(ctx: QueryCtx, userId: string, since: number) {
  return await ctx.db
    .query("analytics")
    .withIndex("by_userId", (q) => q.eq("userId", userId))
    .filter((q) => q.gte(q.field("scrapedAt"), since))
    .collect();
}

// Shared by the single-user and whole-team overviews — same reduction over
// whatever raw analytics rows the caller already gathered, so a team's
// numbers are real totals across its members' actual rows, not an average
// of averages.
function summarizeAnalytics(filtered: Doc<"analytics">[]) {
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
}

async function overviewForUserId(
  ctx: QueryCtx,
  userId: string,
  platform: string | undefined,
  days: number | undefined,
) {
  const since = days ? Date.now() - days * 24 * 60 * 60 * 1000 : 0;
  const analytics = await fetchAnalyticsRows(ctx, userId, since);
  const filtered = platform
    ? analytics.filter((a) => a.platform === platform)
    : analytics;
  return summarizeAnalytics(filtered);
}

// Every real analytics row across everyone currently on a team — the
// Content Studio's team-scoped overview. A real sum of the team's actual
// numbers, not an average of each member's own average.
async function overviewForTeamId(
  ctx: QueryCtx,
  teamId: Id<"teams">,
  platform: string | undefined,
  days: number | undefined,
) {
  const since = days ? Date.now() - days * 24 * 60 * 60 * 1000 : 0;
  const members = await ctx.db
    .query("teamMembers")
    .withIndex("by_teamId", (q) => q.eq("teamId", teamId))
    .collect();
  const linked = members.filter(
    (m): m is typeof m & { clerkUserId: string } => !!m.clerkUserId,
  );
  const perMember = await Promise.all(
    linked.map((member) => fetchAnalyticsRows(ctx, member.clerkUserId, since)),
  );
  const analytics = perMember.flat();
  const filtered = platform
    ? analytics.filter((a) => a.platform === platform)
    : analytics;
  return summarizeAnalytics(filtered);
}

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
    if (!identity) return EMPTY_OVERVIEW;
    return await overviewForUserId(ctx, identity.subject, args.platform, args.days);
  },
});

// Admin visibility into a specific teammate's real analytics overview —
// gated by manageTeam, deliberately cross-user. Same computation as
// getOverview, just for a userId an admin picked instead of the caller.
export const getOverviewAdmin = query({
  args: {
    userId: v.string(),
    platform: v.optional(v.string()),
    days: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await requirePermission(ctx, "manageTeam");
    return await overviewForUserId(ctx, args.userId, args.platform, args.days);
  },
});

// Content Studio's team-scoped overview — real totals across everyone
// currently on the chosen team, not one person's numbers.
export const getOverviewForTeamAdmin = query({
  args: {
    teamId: v.id("teams"),
    platform: v.optional(v.string()),
    days: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await requirePermission(ctx, "manageTeam");
    return await overviewForTeamId(ctx, args.teamId, args.platform, args.days);
  },
});

const COMMENT_CATEGORIES = [
  "Lead",
  "Question",
  "Complaint",
  "Feedback",
  "Engagement",
  "Other",
] as const;

async function commentBreakdownForPost(ctx: QueryCtx, postId: Id<"posts">) {
  const comments = await ctx.db
    .query("comments")
    .withIndex("by_postId", (q) => q.eq("postId", postId))
    .collect();
  const breakdown = Object.fromEntries(
    COMMENT_CATEGORIES.map((category) => [category, 0]),
  ) as Record<(typeof COMMENT_CATEGORIES)[number], number>;
  for (const comment of comments) {
    if ((COMMENT_CATEGORIES as readonly string[]).includes(comment.classification)) {
      breakdown[comment.classification as (typeof COMMENT_CATEGORIES)[number]] += 1;
    } else {
      breakdown.Other += 1;
    }
  }
  return breakdown;
}

function engagementRateFor(entry: { likes: number; comments: number; shares?: number; reach?: number }) {
  if (!entry.reach || entry.reach <= 0) return null;
  return (entry.likes + entry.comments + (entry.shares ?? 0)) / entry.reach;
}

// ── Get all posts with their latest analytics (for list view) ────
// Each row also carries a real comment-classification breakdown — what a
// post actually drove (leads, questions, complaints...), not just likes —
// computed live from the same Gemini-classified comments already stored,
// never a separate/fabricated number.
// Shared by the single-user and whole-team posts+analytics lists — enriches
// whatever raw post docs the caller already gathered with each post's
// latest analytics, comment breakdown, and engagement rate.
async function enrichPostsWithAnalytics(ctx: QueryCtx, posts: Doc<"posts">[]) {
  const result = [];
  for (const post of posts) {
    const latest = await ctx.db
      .query("analytics")
      .withIndex("by_postId", (q) => q.eq("postId", post._id))
      .order("desc")
      .first();
    const commentBreakdown = await commentBreakdownForPost(ctx, post._id);
    result.push({
      post,
      analytics: latest || null,
      commentBreakdown,
      engagementRate: latest ? engagementRateFor(latest) : null,
    });
  }

  // Sort by publishedAt descending (newest first)
  result.sort((a, b) => (b.post.publishedAt || 0) - (a.post.publishedAt || 0));

  return { data: result, count: result.length };
}

async function postsWithAnalyticsForUserId(
  ctx: QueryCtx,
  userId: string,
  platform: string | undefined,
  status: string | undefined,
) {
  const posts = await ctx.db
    .query("posts")
    .withIndex("by_userId", (q) => q.eq("userId", userId))
    .collect();

  let filtered = posts;
  if (platform) filtered = filtered.filter((p) => p.platform === platform);
  if (status) filtered = filtered.filter((p) => p.status === status);

  return await enrichPostsWithAnalytics(ctx, filtered);
}

// Content Studio's team-scoped posts+analytics list — every real post
// published by anyone currently on the chosen team.
async function postsWithAnalyticsForTeamId(
  ctx: QueryCtx,
  teamId: Id<"teams">,
  platform: string | undefined,
  status: string | undefined,
) {
  const members = await ctx.db
    .query("teamMembers")
    .withIndex("by_teamId", (q) => q.eq("teamId", teamId))
    .collect();
  const linked = members.filter(
    (m): m is typeof m & { clerkUserId: string } => !!m.clerkUserId,
  );
  const perMember = await Promise.all(
    linked.map((member) =>
      ctx.db
        .query("posts")
        .withIndex("by_userId", (q) => q.eq("userId", member.clerkUserId))
        .collect(),
    ),
  );
  let filtered = perMember.flat();
  if (platform) filtered = filtered.filter((p) => p.platform === platform);
  if (status) filtered = filtered.filter((p) => p.status === status);

  return await enrichPostsWithAnalytics(ctx, filtered);
}

export const getPostsWithAnalytics = query({
  args: {
    platform: v.optional(v.string()),
    status: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return { data: [], count: 0 };
    return await postsWithAnalyticsForUserId(ctx, identity.subject, args.platform, args.status);
  },
});

// Admin visibility into a specific teammate's real posts+analytics list —
// gated by manageTeam, deliberately cross-user. Same computation as
// getPostsWithAnalytics, just for a userId an admin picked instead of the
// caller. Used by the member activity page.
export const getPostsWithAnalyticsAdmin = query({
  args: {
    userId: v.string(),
    platform: v.optional(v.string()),
    status: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requirePermission(ctx, "manageTeam");
    return await postsWithAnalyticsForUserId(ctx, args.userId, args.platform, args.status);
  },
});

// Content Studio's team-scoped posts+analytics list.
export const getPostsWithAnalyticsForTeamAdmin = query({
  args: {
    teamId: v.id("teams"),
    platform: v.optional(v.string()),
    status: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requirePermission(ctx, "manageTeam");
    return await postsWithAnalyticsForTeamId(ctx, args.teamId, args.platform, args.status);
  },
});

// ── Real time-series of a post's analytics snapshots, not just the latest
// — every refresh already inserts a new row (recordAnalytics), this just
// surfaces that history instead of discarding it.
export const getHistoryForPost = query({
  args: { postId: v.id("posts") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("analytics")
      .withIndex("by_postId", (q) => q.eq("postId", args.postId))
      .order("asc")
      .collect();
  },
});

// Single-post version of the breakdown embedded in getPostsWithAnalytics —
// for the post detail page, which doesn't fetch the whole list.
export const getCommentBreakdownForPost = query({
  args: { postId: v.id("posts") },
  handler: async (ctx, args) => {
    return await commentBreakdownForPost(ctx, args.postId);
  },
});

const DAY_KEYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"] as const;
// Below this many total published-with-analytics posts, any "best day"
// pattern is noise, not signal — say so honestly instead of guessing.
const MIN_TOTAL_FOR_PATTERN = 3;
// A single lucky post shouldn't crown a whole day as "best" — require a
// couple of data points in that specific day before it's eligible.
const MIN_POSTS_PER_DAY = 2;

// ── Real best-day-to-post pattern, from this account's own published
// posts and their actual engagement rate — never a guess, and explicitly
// "not enough data yet" below a real sample-size floor.
export const getBestPostingTimes = query({
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    const posts = await ctx.db
      .query("posts")
      .withIndex("by_userId", (q) => q.eq("userId", identity.subject))
      .filter((q) => q.eq(q.field("status"), "Published"))
      .collect();

    const buckets = DAY_KEYS.map(() => ({ posts: 0, rateSum: 0, withRate: 0 }));
    let totalWithData = 0;

    for (const post of posts) {
      if (!post.publishedAt) continue;
      const latest = await ctx.db
        .query("analytics")
        .withIndex("by_postId", (q) => q.eq("postId", post._id))
        .order("desc")
        .first();
      if (!latest) continue;
      totalWithData += 1;
      const bucket = buckets[new Date(post.publishedAt).getDay()];
      bucket.posts += 1;
      const rate = engagementRateFor(latest);
      if (rate !== null) {
        bucket.rateSum += rate;
        bucket.withRate += 1;
      }
    }

    if (totalWithData < MIN_TOTAL_FOR_PATTERN) {
      return { ready: false as const, totalWithData };
    }

    const days = DAY_KEYS.map((day, index) => ({
      day,
      posts: buckets[index].posts,
      avgEngagementRate:
        buckets[index].withRate > 0 ? buckets[index].rateSum / buckets[index].withRate : null,
    }));

    const eligible = days.filter(
      (d) => d.posts >= MIN_POSTS_PER_DAY && d.avgEngagementRate !== null,
    );
    const best =
      eligible.length > 0
        ? eligible.reduce((a, b) => (b.avgEngagementRate! > a.avgEngagementRate! ? b : a))
        : null;

    return { ready: true as const, totalWithData, days, best };
  },
});

// ── Real per-platform comparison (Instagram vs Facebook, etc.) from this
// account's own published posts.
export const getPlatformComparison = query({
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    const posts = await ctx.db
      .query("posts")
      .withIndex("by_userId", (q) => q.eq("userId", identity.subject))
      .filter((q) => q.eq(q.field("status"), "Published"))
      .collect();

    const byPlatform = new Map<
      string,
      { posts: number; rateSum: number; withRate: number; totalReach: number; totalImpressions: number }
    >();

    for (const post of posts) {
      const latest = await ctx.db
        .query("analytics")
        .withIndex("by_postId", (q) => q.eq("postId", post._id))
        .order("desc")
        .first();
      if (!latest) continue;
      const entry = byPlatform.get(post.platform) ?? {
        posts: 0,
        rateSum: 0,
        withRate: 0,
        totalReach: 0,
        totalImpressions: 0,
      };
      entry.posts += 1;
      entry.totalReach += latest.reach ?? 0;
      entry.totalImpressions += latest.impressions ?? 0;
      const rate = engagementRateFor(latest);
      if (rate !== null) {
        entry.rateSum += rate;
        entry.withRate += 1;
      }
      byPlatform.set(post.platform, entry);
    }

    return Array.from(byPlatform.entries()).map(([platform, entry]) => ({
      platform,
      posts: entry.posts,
      avgEngagementRate: entry.withRate > 0 ? entry.rateSum / entry.withRate : null,
      totalReach: entry.totalReach,
      totalImpressions: entry.totalImpressions,
    }));
  },
});
