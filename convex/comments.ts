import { query, mutation, internalMutation, internalQuery } from "./_generated/server";
import type { MutationCtx } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";

// Called after fetching real comments via meta.fetchPostComments (which
// already derived and verified the caller's identity), so every comment in
// the batch is stamped with that one verified identity here rather than
// trusting a per-comment userId from the client.
export const storeComments = mutation({
  args: {
    comments: v.array(
      v.object({
        postId: v.id("posts"),
        authorName: v.string(),
        content: v.string(),
        platform: v.union(v.literal("facebook"), v.literal("instagram")),
        classification: v.string(),
        scrapedAt: v.number(),
      })
    ),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    for (const c of args.comments) {
      const commentId = await ctx.db.insert("comments", {
        userId: identity.subject,
        targetUrl: "",
        postId: c.postId,
        authorName: c.authorName,
        content: c.content,
        platform: c.platform,
        classification: c.classification,
        status: "Published",
        createdAt: c.scrapedAt,
      });

      // Best-effort: a Lead/Question comment from someone whose name
      // matches a tracked account's buying-group member is real intent.
      const match = await ctx.runMutation(internal.growth.logSocialSignalForCommenter, {
        authorName: c.authorName,
        classification: c.classification,
        content: c.content,
        postId: c.postId,
      });
      // Denormalized onto the comment so the social side (Comments page)
      // can show "known CRM contact" without a second lookup.
      if (match) {
        await ctx.db.patch(commentId, {
          matchedAccountId: match.accountId,
          matchedAccountName: match.accountName,
        });
      }
    }
  },
});

export const getCommentsForPost = query({
  args: { postId: v.id("posts") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("comments")
      .withIndex("by_postId", (q) => q.eq("postId", args.postId))
      .collect();
  },
});

// Identity is derived from the caller's own session, never trusted from an
// argument — otherwise anyone signed in could post a comment "as" another
// teammate's connected account.
export const createComment = mutation({
  args: {
    targetUrl: v.string(),
    authorName: v.string(),
    content: v.string(),
    platform: v.union(v.literal("facebook"), v.literal("instagram")),
    classification: v.optional(v.union(
      v.literal("Lead"),
      v.literal("Question"),
      v.literal("Complaint"),
      v.literal("Feedback"),
      v.literal("Engagement"),
      v.literal("Other"),
    )),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    return await ctx.db.insert("comments", {
      userId: identity.subject,
      targetUrl: args.targetUrl,
      authorName: args.authorName,
      content: args.content,
      platform: args.platform,
      classification: args.classification || "Engagement",
      status: "Published",
      createdAt: Date.now(),
    });
  },
});

export const scheduleComment = mutation({
  args: {
    targetUrl: v.string(),
    authorName: v.string(),
    content: v.string(),
    scheduledAt: v.number(),
    platform: v.union(v.literal("facebook"), v.literal("instagram")),
    classification: v.optional(v.union(
      v.literal("Lead"),
      v.literal("Question"),
      v.literal("Complaint"),
      v.literal("Feedback"),
      v.literal("Engagement"),
      v.literal("Other"),
    )),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    return await ctx.db.insert("comments", {
      userId: identity.subject,
      targetUrl: args.targetUrl,
      authorName: args.authorName,
      content: args.content,
      platform: args.platform,
      classification: args.classification || "Engagement",
      scheduledAt: args.scheduledAt,
      status: "Scheduled",
      createdAt: Date.now(),
    });
  },
});

// Only ever called from the cron pipeline (meta.processDueComments).
export const getScheduledComments = internalQuery({
  handler: async (ctx) => {
    const now = Date.now();
    return await ctx.db
      .query("comments")
      .withIndex("by_status_scheduled", (q) =>
        q.eq("status", "Scheduled").lte("scheduledAt", now)
      )
      .collect();
  },
});

export const markCommentProcessing = internalMutation({
  args: { commentId: v.id("comments") },
  handler: async (ctx, args) => {
    const comment = await ctx.db.get(args.commentId);
    if (!comment) throw new Error("Comment not found");
    if (comment.status !== "Scheduled") return;
    await ctx.db.patch(args.commentId, {
      status: "Processing",
    });
  },
});

export const markCommentPublished = internalMutation({
  args: { commentId: v.id("comments") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.commentId, {
      status: "Published",
    });
  },
});

export const markCommentFailed = internalMutation({
  args: { commentId: v.id("comments"), error: v.optional(v.string()) },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.commentId, {
      status: "Failed",
      error: args.error,
    });
  },
});

// The caller's own comments — identity-derived, no userId argument to spoof.
export const getCommentsForUser = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];
    return await ctx.db
      .query("comments")
      .withIndex("by_userId", (q) => q.eq("userId", identity.subject))
      .collect();
  },
});

async function requireOwnComment(ctx: MutationCtx, commentId: Id<"comments">) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new Error("Not authenticated");
  const comment = await ctx.db.get(commentId);
  if (!comment) throw new Error("Comment not found");
  if (comment.userId !== identity.subject) {
    throw new Error("You can only manage your own comments");
  }
  return comment;
}

export const deleteComment = mutation({
  args: { commentId: v.id("comments") },
  handler: async (ctx, args) => {
    await requireOwnComment(ctx, args.commentId);
    await ctx.db.delete(args.commentId);
  },
});
