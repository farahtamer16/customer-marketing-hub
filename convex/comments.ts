import { query, mutation, internalMutation, internalQuery } from "./_generated/server";
import type { MutationCtx } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { requireInWorkspace, requireMember, requirePermission } from "./authz";

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
        // Meta's own comment id — present when this came from a real
        // Graph API fetch, absent for anything entered by hand. Required
        // to reply to the comment later, so auto-reply only ever fires
        // for comments that have one.
        platformCommentId: v.optional(v.string()),
      })
    ),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const self = await requireMember(ctx);

    for (const c of args.comments) {
      const commentId = await ctx.db.insert("comments", {
        userId: identity.subject,
        workspaceId: self.workspaceId,
        targetUrl: "",
        postId: c.postId,
        authorName: c.authorName,
        content: c.content,
        platform: c.platform,
        classification: c.classification,
        platformCommentId: c.platformCommentId,
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
        workspaceId: self.workspaceId,
      });
      // Denormalized onto the comment so the social side (Comments page)
      // can show "known CRM contact" without a second lookup.
      if (match) {
        await ctx.db.patch(commentId, {
          matchedAccountId: match.accountId,
          matchedAccountName: match.accountName,
        });
      }

      // Hand off to autoReply.ts rather than deciding here — this mutation
      // can't call Gemini or the Graph API itself. No-ops instantly if the
      // workspace hasn't opted in.
      await ctx.scheduler.runAfter(0, internal.autoReply.maybeAutoReply, {
        commentId,
      });
    }
  },
});

// Readable by anyone in the same workspace as the post (not just its
// author) — the post detail page shows a teammate's comments the same way
// it shows their analytics, matching analytics.ts's
// assertPostReadableByCaller. Used to have no check at all.
export const getCommentsForPost = query({
  args: { postId: v.id("posts") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];
    const post = await ctx.db.get(args.postId);
    if (!post) return [];
    const self = await ctx.db
      .query("teamMembers")
      .withIndex("by_clerkUserId", (q) => q.eq("clerkUserId", identity.subject))
      .unique();
    if (!self || post.workspaceId !== self.workspaceId) return [];
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
    const self = await requireMember(ctx);
    return await ctx.db.insert("comments", {
      userId: identity.subject,
      workspaceId: self.workspaceId,
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
    const self = await requireMember(ctx);
    return await ctx.db.insert("comments", {
      userId: identity.subject,
      workspaceId: self.workspaceId,
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

// Admin visibility into a specific teammate's real comments — gated by
// manageTeam, deliberately cross-user. Used by the member activity page.
export const getCommentsForUserAdmin = query({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    const actor = await requirePermission(ctx, "manageTeam");
    const target = await ctx.db
      .query("teamMembers")
      .withIndex("by_clerkUserId", (q) => q.eq("clerkUserId", args.userId))
      .unique();
    if (target) requireInWorkspace(actor, target);
    return await ctx.db
      .query("comments")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .collect();
  },
});

// Every real comment recorded against anyone currently on this team — the
// Content Studio's team-scoped comments view. Gated the same as
// getCommentsForUserAdmin, just aggregated across the team's members.
// teamId omitted = every real comment across the whole workspace.
export const getCommentsForTeamAdmin = query({
  args: { teamId: v.optional(v.id("teams")) },
  handler: async (ctx, args) => {
    const actor = await requirePermission(ctx, "manageTeam");
    let members;
    if (args.teamId) {
      const team = await ctx.db.get(args.teamId);
      if (!team) throw new Error("Team not found");
      requireInWorkspace(actor, team);
      members = await ctx.db
        .query("teamMembers")
        .withIndex("by_teamId", (q) => q.eq("teamId", args.teamId))
        .collect();
    } else {
      members = await ctx.db
        .query("teamMembers")
        .withIndex("by_workspaceId", (q) => q.eq("workspaceId", actor.workspaceId))
        .collect();
    }
    const linked = members.filter(
      (m): m is typeof m & { clerkUserId: string } => !!m.clerkUserId,
    );
    const perMember = await Promise.all(
      linked.map((member) =>
        ctx.db
          .query("comments")
          .withIndex("by_userId", (q) => q.eq("userId", member.clerkUserId))
          .collect(),
      ),
    );
    return perMember.flat().sort((a, b) => b.createdAt - a.createdAt);
  },
});

// Auto-reply runs fully automatically with no per-comment human approval
// (see autoReply.ts), so this is the only place anyone can see whether it's
// actually working — what got replied to, what failed, and why. Any team
// member can see it, matching getAutoReplySettings' own visibility.
export const listAutoReplyActivity = query({
  args: {},
  handler: async (ctx) => {
    const actor = await requireMember(ctx);
    const comments = await ctx.db
      .query("comments")
      .withIndex("by_workspaceId", (q) => q.eq("workspaceId", actor.workspaceId))
      .collect();
    return comments
      .filter(
        (comment): comment is typeof comment & { autoReply: NonNullable<typeof comment.autoReply> } =>
          comment.autoReply !== undefined,
      )
      .sort((a, b) => b.autoReply.repliedAt - a.autoReply.repliedAt)
      .slice(0, 30)
      .map((comment) => ({
        _id: comment._id,
        postId: comment.postId,
        authorName: comment.authorName,
        content: comment.content,
        classification: comment.classification,
        platform: comment.platform,
        autoReply: comment.autoReply,
      }));
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

// Admin equivalent — gated by manageTeam instead of ownership, since this
// acts on a team member's comment record from Content Studio.
export const deleteCommentAdmin = mutation({
  args: { commentId: v.id("comments") },
  handler: async (ctx, args) => {
    const actor = await requirePermission(ctx, "manageTeam");
    const comment = await ctx.db.get(args.commentId);
    if (!comment) throw new Error("Comment not found");
    requireInWorkspace(actor, comment);
    await ctx.db.delete(args.commentId);
  },
});

// Internal-only: autoReply.ts runs off a scheduled job with no signed-in
// caller, so it can't go through the identity-gated reads above.
export const getCommentInternal = internalQuery({
  args: { commentId: v.id("comments") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.commentId);
  },
});

export const markAutoReplyResult = internalMutation({
  args: {
    commentId: v.id("comments"),
    status: v.union(v.literal("sent"), v.literal("failed")),
    text: v.optional(v.string()),
    error: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.commentId, {
      autoReply: {
        status: args.status,
        text: args.text,
        error: args.error,
        repliedAt: Date.now(),
      },
    });
  },
});
