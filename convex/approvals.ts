import { query, mutation, internalMutation, internalAction } from "./_generated/server";
import { v } from "convex/values";
import { api, internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { requireMember, requirePermission } from "./authz";

const workspaceRole = v.union(
  v.literal("ownerAdmin"),
  v.literal("cmo"),
  v.literal("marketingManager"),
  v.literal("socialMediaUser"),
);

export const listPosts = query({
  handler: async (ctx) => {
    const posts = await ctx.db.query("approvalPosts").collect();
    return posts.map((post) => ({ id: post._id, ...post }));
  },
});

export const getPost = query({
  args: { postId: v.id("approvalPosts") },
  handler: async (ctx, args) => {
    const post = await ctx.db.get(args.postId);
    return post ? { id: post._id, ...post } : null;
  },
});

export const createPost = mutation({
  args: {
    author: v.string(),
    campaign: v.string(),
    content: v.string(),
    channels: v.array(v.union(v.literal("facebook"), v.literal("instagram"))),
    priority: v.union(v.literal("standard"), v.literal("high")),
    scheduledAt: v.optional(v.number()),
    storageId: v.optional(v.id("_storage")),
    steps: v.array(
      v.object({
        id: v.string(),
        role: workspaceRole,
        assignee: v.string(),
      }),
    ),
  },
  handler: async (ctx, args) => {
    await requirePermission(ctx, "publishContent");

    const now = Date.now();
    const identity = await ctx.auth.getUserIdentity();
    const actor = identity?.name ?? args.author;

    const postId = await ctx.db.insert("approvalPosts", {
      author: args.author,
      // Derived from the caller's own authenticated identity, not trusted
      // from the client — this is who publishing will run as once approved.
      authorUserId: identity?.subject,
      campaign: args.campaign,
      content: args.content,
      channels: args.channels,
      storageId: args.storageId,
      priority: args.priority,
      scheduledAt: args.scheduledAt,
      status: "pending",
      submittedAt: now,
      steps: args.steps.map((step, index) => ({
        ...step,
        status: index === 0 ? "current" : "waiting",
      })),
      history: [
        { id: `${now}-created`, actor, action: "created", occurredAt: now },
        { id: `${now}-submitted`, actor, action: "submitted", occurredAt: now },
      ],
      createdAt: now,
      updatedAt: now,
    });

    await ctx.db.insert("workspaceNotifications", {
      kind: "approval",
      title: `${args.campaign} needs approval`,
      detail: `${actor} submitted a post awaiting ${args.steps[0]?.role ?? "review"}.`,
      occurredAt: now,
      read: false,
      href: `/growth/approvals/${postId}`,
    });

    return postId;
  },
});

export const decide = mutation({
  args: {
    postId: v.id("approvalPosts"),
    decision: v.union(
      v.literal("approve"),
      v.literal("changes"),
      v.literal("reject"),
    ),
    note: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const post = await ctx.db.get(args.postId);
    if (!post) throw new Error("Approval post not found");

    const member = await requireMember(ctx);
    const currentStep = post.steps.find((step) => step.status === "current");
    if (!currentStep) throw new Error("This post has no step awaiting a decision");
    if (member.role !== "ownerAdmin" && member.role !== currentStep.role) {
      throw new Error(
        `This step is awaiting a decision from the ${currentStep.role} role — you're a ${member.role}.`,
      );
    }

    const actor = member.name;
    const now = Date.now();

    const nextStatus =
      args.decision === "approve"
        ? "approved"
        : args.decision === "changes"
          ? "changesRequested"
          : "rejected";
    const historyAction =
      args.decision === "approve"
        ? "approved"
        : args.decision === "reject"
          ? "rejected"
          : "changesRequested";

    const currentIndex = post.steps.findIndex(
      (step) => step.status === "current",
    );
    const steps = post.steps.map((step, index) => {
      if (index !== currentIndex) return step;
      if (args.decision === "approve") return { ...step, status: "approved" as const };
      if (args.decision === "reject") return { ...step, status: "rejected" as const };
      return step;
    });
    if (
      args.decision === "approve" &&
      currentIndex >= 0 &&
      currentIndex + 1 < steps.length
    ) {
      steps[currentIndex + 1] = {
        ...steps[currentIndex + 1],
        status: "current",
      };
    }
    const allApproved = steps.every((step) => step.status === "approved");

    await ctx.db.patch(args.postId, {
      status: args.decision === "approve" && allApproved ? "approved" : nextStatus,
      steps,
      history: [
        ...post.history,
        {
          id: `${now}-${historyAction}`,
          actor,
          action: historyAction,
          occurredAt: now,
          note: args.note,
        },
      ],
      updatedAt: now,
    });

    if (args.decision === "approve" && allApproved) {
      await ctx.db.insert("auditLog", {
        actor,
        action: "postApproved",
        target: post.campaign,
        occurredAt: now,
      });
      await ctx.scheduler.runAfter(0, internal.approvals.publishApprovedPost, {
        postId: args.postId,
      });
    } else if (args.decision !== "approve") {
      await ctx.db.insert("workspaceNotifications", {
        kind: "approval",
        title:
          args.decision === "reject"
            ? `${post.campaign} was rejected`
            : `${post.campaign} needs changes`,
        detail: `${actor} ${historyAction === "rejected" ? "rejected" : "requested changes on"} this post.`,
        occurredAt: now,
        read: false,
        href: `/growth/approvals/${args.postId}`,
      });
    }
  },
});

// Runs once every approval step signs off. Publishing is an action (it
// makes real HTTP calls to Meta), which a mutation like `decide` above
// can't do directly — so `decide` schedules this instead of calling it.
export const publishApprovedPost = internalAction({
  args: { postId: v.id("approvalPosts") },
  handler: async (ctx, args): Promise<void> => {
    const post = await ctx.runQuery(api.approvals.getPost, { postId: args.postId });
    if (!post) return;

    if (!post.authorUserId) {
      await ctx.runMutation(internal.approvals.markPublishResult, {
        postId: args.postId,
        publishError:
          "This approval was created before author tracking existed, so it can't be auto-published — publish it manually.",
      });
      return;
    }

    const errors: string[] = [];
    let resultingPostId: Id<"posts"> | undefined;

    for (const channel of post.channels) {
      try {
        if (channel === "facebook") {
          const result = await ctx.runAction(internal.meta.publishFacebookPostAs, {
            userId: post.authorUserId,
            content: post.content,
            storageId: post.storageId,
          });
          resultingPostId = result.postId;
        } else {
          if (!post.storageId) {
            errors.push("instagram: an image is required and none was attached");
            continue;
          }
          const result = await ctx.runAction(internal.meta.publishInstagramPostAs, {
            userId: post.authorUserId,
            caption: post.content,
            storageId: post.storageId,
          });
          resultingPostId = result.postId;
        }
      } catch (error) {
        errors.push(`${channel}: ${error instanceof Error ? error.message : String(error)}`);
      }
    }

    await ctx.runMutation(internal.approvals.markPublishResult, {
      postId: args.postId,
      resultingPostId,
      publishError: errors.length > 0 ? errors.join("; ") : undefined,
      published: resultingPostId !== undefined,
    });
  },
});

export const markPublishResult = internalMutation({
  args: {
    postId: v.id("approvalPosts"),
    resultingPostId: v.optional(v.id("posts")),
    publishError: v.optional(v.string()),
    published: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const post = await ctx.db.get(args.postId);
    if (!post) return;
    const now = Date.now();

    await ctx.db.patch(args.postId, {
      status: args.published ? "published" : post.status,
      resultingPostId: args.resultingPostId,
      publishError: args.publishError,
      updatedAt: now,
    });

    await ctx.db.insert("workspaceNotifications", {
      kind: args.published ? "approval" : "system",
      title: args.published
        ? `${post.campaign} is now live`
        : `${post.campaign} failed to publish`,
      detail: args.published
        ? `Approved post published to ${post.channels.join(", ")}.`
        : (args.publishError ?? "Publishing failed for an unknown reason."),
      occurredAt: now,
      read: false,
      href: `/growth/approvals/${args.postId}`,
    });
  },
});
