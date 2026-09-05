import { query, mutation, internalMutation, internalQuery } from "./_generated/server";
import type { MutationCtx } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { requirePermission } from "./authz";

// Internal-only: only ever called from convex/meta.ts after it has already
// derived the real publisher's identity server-side (never reachable from
// the browser, so there's nothing here for a client to spoof).
export const recordPublishedPost = internalMutation({
  args: {
    userId: v.string(),
    platform: v.union(
      v.literal("Instagram"),
      v.literal("Facebook"),
      v.literal("LinkedIn"),
      v.literal("TikTok"),
      v.literal("X")
    ),
    content: v.string(),
    mediaUrl: v.optional(v.string()),
    socialAccountId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const id = await ctx.db.insert("posts", {
      userId: args.userId,
      platform: args.platform,
      content: args.content,
      mediaUrl: args.mediaUrl,
      socialAccountId: args.socialAccountId,
      status: "Published",
      publishedAt: Date.now(),
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    // Real adoption evidence: if whoever published this is at a company we
    // track as a growth account (matched by email domain), log it as a
    // real product-usage signal instead of adoption only moving when
    // someone remembers to log it by hand.
    const publisher = await ctx.db
      .query("teamMembers")
      .withIndex("by_clerkUserId", (q) => q.eq("clerkUserId", args.userId))
      .unique();
    if (publisher?.email) {
      await ctx.runMutation(internal.growth.logProductSignal, {
        email: publisher.email,
        kind: "postCreated",
        postId: id,
      });
    }

    return id;
  },
});

// Only ever called from meta.ts's fetchPostAnalytics, after it has already
// verified the caller owns the post.
export const markAnalyticsCollected = internalMutation({
  args: { postId: v.id("posts") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.postId, {
      analyticsCollected: true,
      lastAnalyticsScraped: Date.now(),
      updatedAt: Date.now(),
    });
  },
});

// Public entry point — called directly from the browser. Identity is
// derived from the caller's own session, never trusted from an argument:
// otherwise anyone signed in could schedule a post that publishes as a
// different teammate.
export const schedulePost = mutation({
  args: {
    platform: v.union(
      v.literal("Instagram"),
      v.literal("Facebook"),
      v.literal("LinkedIn"),
      v.literal("TikTok"),
      v.literal("X")
    ),
    content: v.string(),
    scheduledAt: v.number(),
    mediaUrl: v.optional(v.string()),
    socialAccountId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    const id = await ctx.db.insert("posts", {
      userId: identity.subject,
      platform: args.platform,
      content: args.content,
      mediaUrl: args.mediaUrl,
      socialAccountId: args.socialAccountId,
      status: "Scheduled",
      scheduledAt: args.scheduledAt,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
    return id;
  },
});

// The caller's own posts — identity-derived, no userId argument to spoof.
export const getPostsForUser = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];
    return await ctx.db
      .query("posts")
      .withIndex("by_userId", (q) => q.eq("userId", identity.subject))
      .order("desc")
      .collect();
  },
});

// Admin visibility into a specific teammate's real posts — gated by
// manageTeam (not "own posts" identity-derivation), since this is
// deliberately cross-user. Used by the member activity page so an admin
// can see everything a given user actually published, not just totals.
export const getPostsForUserAdmin = query({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    await requirePermission(ctx, "manageTeam");
    return await ctx.db
      .query("posts")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .order("desc")
      .collect();
  },
});

// Every real post published by anyone currently on this team — the
// Content Studio's team-scoped posts/calendar view, not one admin's own
// posts. Gated the same as getPostsForUserAdmin, just aggregated across a
// team's linked members instead of one.
export const getPostsForTeamAdmin = query({
  args: { teamId: v.id("teams") },
  handler: async (ctx, args) => {
    await requirePermission(ctx, "manageTeam");
    const members = await ctx.db
      .query("teamMembers")
      .withIndex("by_teamId", (q) => q.eq("teamId", args.teamId))
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
    return perMember.flat().sort((a, b) => b._creationTime - a._creationTime);
  },
});

// Same lookup for a known, already-trusted userId — used by meta.ts's
// findOwnPostByUrl, where the userId comes from a real identity or a
// stored comment's userId, never from client input. Internal only.
export const getPostsForUserInternal = internalQuery({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("posts")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .order("desc")
      .collect();
  },
});

// Workspace-wide (not scoped to one user) — for picking which real posts a
// campaign should roll up analytics from. A campaign can span content
// published by different teammates, so this can't be the per-user query.
export const listPublished = query({
  handler: async (ctx) => {
    return await ctx.db
      .query("posts")
      .withIndex("by_status", (q) => q.eq("status", "Published"))
      .order("desc")
      .collect();
  },
});

// Only ever called from the cron pipeline (meta.processDuePosts).
export const getScheduledItems = internalQuery({
  handler: async (ctx) => {
    const now = Date.now();
    return await ctx.db
      .query("posts")
      .withIndex("by_status", (q) => q.eq("status", "Scheduled"))
      .filter((q) => q.lte(q.field("scheduledAt"), now))
      .collect();
  },
});

export const markItemFailed = internalMutation({
  args: { postId: v.id("posts"), error: v.optional(v.string()) },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.postId, {
      status: "Failed",
      error: args.error,
      updatedAt: Date.now(),
    });
  },
});

export const markItemPublished = internalMutation({
  args: {
    postId: v.id("posts"),
    postUrl: v.optional(v.string()),
    platformPostId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const post = await ctx.db.get(args.postId);
    await ctx.db.patch(args.postId, {
      status: "Published",
      publishedAt: Date.now(),
      updatedAt: Date.now(),
      postUrl: args.postUrl,
      platformPostId: args.platformPostId,
    });

    // A scheduled post going live is just as real a "created a post" event
    // as a direct publish — same adoption-signal hook as recordPublishedPost.
    if (post) {
      const publisher = await ctx.db
        .query("teamMembers")
        .withIndex("by_clerkUserId", (q) => q.eq("clerkUserId", post.userId))
        .unique();
      if (publisher?.email) {
        await ctx.runMutation(internal.growth.logProductSignal, {
          email: publisher.email,
          kind: "postCreated",
          postId: args.postId,
        });
      }
    }
  },
});

// Ownership is checked here, not just trusted from postId — otherwise any
// signed-in user could cancel, delete, or retry another teammate's post by
// guessing/enumerating an id.
async function requireOwnPost(ctx: MutationCtx, postId: Id<"posts">) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new Error("Not authenticated");
  const post = await ctx.db.get(postId);
  if (!post) throw new Error("Post not found");
  if (post.userId !== identity.subject) {
    throw new Error("You can only manage your own posts");
  }
  return post;
}

export const cancelScheduledItem = mutation({
  args: { postId: v.id("posts") },
  handler: async (ctx, args) => {
    const item = await requireOwnPost(ctx, args.postId);
    if (item.status !== "Scheduled") throw new Error("Only scheduled posts can be cancelled");
    await ctx.db.delete(args.postId);
  },
});

export const deletePost = mutation({
  args: { postId: v.id("posts") },
  handler: async (ctx, args) => {
    await requireOwnPost(ctx, args.postId);
    await ctx.db.delete(args.postId);
  },
});

// Public entry point for a user manually pasting in the live post URL when
// auto-detection didn't catch it — ownership is checked via requireOwnPost,
// unlike the internal updatePostUrl below which the publish pipeline calls
// with no signed-in caller to check against.
export const setPostUrl = mutation({
  args: {
    postId: v.id("posts"),
    postUrl: v.string(),
  },
  handler: async (ctx, args) => {
    await requireOwnPost(ctx, args.postId);
    await ctx.db.patch(args.postId, {
      postUrl: args.postUrl,
      updatedAt: Date.now(),
    });
  },
});

export const retryPost = mutation({
  args: { postId: v.id("posts") },
  handler: async (ctx, args) => {
    const item = await requireOwnPost(ctx, args.postId);
    if (item.status !== "Failed") throw new Error("Only failed posts can be retried");
    await ctx.db.patch(args.postId, {
      status: "Scheduled",
      scheduledAt: Date.now() + 60000,
      updatedAt: Date.now(),
    });
  },
});

// Admin equivalents of the three mutations above — gated by manageTeam
// instead of requireOwnPost, since these act on a team member's post, not
// the caller's own. Used by Content Studio so an admin can actually
// manage what they're looking at, not just view it.
export const cancelScheduledItemAdmin = mutation({
  args: { postId: v.id("posts") },
  handler: async (ctx, args) => {
    await requirePermission(ctx, "manageTeam");
    const item = await ctx.db.get(args.postId);
    if (!item) throw new Error("Post not found");
    if (item.status !== "Scheduled") throw new Error("Only scheduled posts can be cancelled");
    await ctx.db.delete(args.postId);
  },
});

export const deletePostAdmin = mutation({
  args: { postId: v.id("posts") },
  handler: async (ctx, args) => {
    await requirePermission(ctx, "manageTeam");
    await ctx.db.delete(args.postId);
  },
});

export const retryPostAdmin = mutation({
  args: { postId: v.id("posts") },
  handler: async (ctx, args) => {
    await requirePermission(ctx, "manageTeam");
    const item = await ctx.db.get(args.postId);
    if (!item) throw new Error("Post not found");
    if (item.status !== "Failed") throw new Error("Only failed posts can be retried");
    await ctx.db.patch(args.postId, {
      status: "Scheduled",
      scheduledAt: Date.now() + 60000,
      updatedAt: Date.now(),
    });
  },
});

// Only ever called from meta.ts's publish pipeline.
export const markItemProcessing = internalMutation({
  args: { postId: v.id("posts") },
  handler: async (ctx, args) => {
    const post = await ctx.db.get(args.postId);
    if (!post) throw new Error("Post not found");
    if (post.status !== "Scheduled") {
      console.log(`⏭️ Post ${args.postId} already ${post.status}, skipping.`);
      return;
    }
    await ctx.db.patch(args.postId, {
      status: "Processing",
      updatedAt: Date.now(),
    });
  },
});

// Only ever called from meta.ts's publish pipeline.
export const updatePostUrl = internalMutation({
  args: {
    postId: v.id("posts"),
    postUrl: v.string(),
    platformPostId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.postId, {
      postUrl: args.postUrl,
      platformPostId: args.platformPostId,
      updatedAt: Date.now(),
    });
  },
});

export const getPost = query({
  args: { postId: v.id("posts") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.postId);
  },
});
