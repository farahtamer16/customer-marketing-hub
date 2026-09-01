import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
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

    return await ctx.db.insert("approvalPosts", {
      author: args.author,
      campaign: args.campaign,
      content: args.content,
      channels: args.channels,
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
    }
  },
});
