import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";

export const storeComments = mutation({
  args: {
    comments: v.array(
      v.object({
        postId: v.id("posts"),
        userId: v.string(),
        authorName: v.string(),
        content: v.string(),
        platform: v.union(v.literal("facebook"), v.literal("instagram")),
        classification: v.string(),
        scrapedAt: v.number(),
      })
    ),
  },
  handler: async (ctx, args) => {
    for (const c of args.comments) {
      await ctx.db.insert("comments", {
        userId: c.userId,
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
      await ctx.runMutation(internal.growth.logSocialSignalForCommenter, {
        authorName: c.authorName,
        classification: c.classification,
        content: c.content,
      });
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


export const createComment = mutation({
  args: {
    userId: v.string(),
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
    return await ctx.db.insert("comments", {
      userId: args.userId,
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
    userId: v.string(),
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
    return await ctx.db.insert("comments", {
      userId: args.userId,
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

export const getScheduledComments = query({
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

export const markCommentProcessing = mutation({
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

export const markCommentPublished = mutation({
  args: { commentId: v.id("comments") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.commentId, {
      status: "Published",
    });
  },
});

export const markCommentFailed = mutation({
  args: { commentId: v.id("comments"), error: v.optional(v.string()) },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.commentId, {
      status: "Failed",
      error: args.error,
    });
  },
});

export const getCommentsForUser = query({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("comments")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .collect();
  },
});

export const deleteComment = mutation({
  args: { commentId: v.id("comments") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.commentId);
  },
});