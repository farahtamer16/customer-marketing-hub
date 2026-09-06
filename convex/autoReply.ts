import { v } from "convex/values";
import { internalAction } from "./_generated/server";
import { internal } from "./_generated/api";

// Gemini model choice matches app/api/ai/classify's — same tier, already
// proven fast enough for this kind of short, low-stakes generation.
const GEMINI_MODEL = "gemini-3.5-flash-lite";

async function generateReplyText(args: {
  comment: string;
  classification: string;
  postContent: string;
}): Promise<string> {
  const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  if (!apiKey) {
    throw new Error(
      "Auto-reply isn't configured yet — GOOGLE_GENERATIVE_AI_API_KEY is missing.",
    );
  }

  const prompt = `You are replying, as the business, to a real comment on one of your own social media posts. The comment has already been classified as "${args.classification}".

Original post: "${args.postContent}"
Comment: "${args.comment}"

Write a short, genuine, on-brand reply (1-2 sentences, no hashtags, no emoji unless the comment itself uses one). Match the tone to the classification: helpful and direct for a Question, warm and appreciative for a Lead, sincerely apologetic and offering to make it right for a Complaint, thankful for Feedback or Engagement. Return ONLY the reply text — no quotes, no explanation, no markdown.`;

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
      }),
    },
  );
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error?.message ?? `Gemini request failed (${response.status})`);
  }
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text as string | undefined;
  if (!text?.trim()) {
    throw new Error("Gemini returned an empty reply");
  }
  return text.trim();
}

// The one place this whole feature actually happens: fired via
// ctx.scheduler.runAfter from comments.storeComments for every newly
// stored comment, so it runs automatically — no per-comment human
// approval step. Every early return here is a deliberate guardrail, not
// an incomplete feature: no platform id, no opt-in, or no matching
// classification all mean "don't touch this comment."
export const maybeAutoReply = internalAction({
  args: { commentId: v.id("comments") },
  handler: async (ctx, args) => {
    const comment = await ctx.runQuery(internal.comments.getCommentInternal, {
      commentId: args.commentId,
    });
    if (!comment) return;

    // Nothing to reply to via the Graph API — only real Meta-fetched
    // comments carry this; anything entered by hand never qualifies.
    if (!comment.platformCommentId) return;
    if (!comment.postId) return;

    const settings = await ctx.runQuery(internal.workspaces.getAutoReplySettingsInternal, {
      workspaceId: comment.workspaceId,
    });
    if (!settings.enabled) return;
    if (!settings.classifications.includes(comment.classification)) return;

    const post = await ctx.runQuery(internal.posts.getPostInternal, {
      postId: comment.postId,
    });
    if (!post) return;

    const credentials = await ctx.runQuery(internal.socialAccounts.getMetaCredentials, {
      userId: post.userId,
      platform: post.platform === "Instagram" ? "Instagram" : "Facebook",
    });
    if (!credentials) {
      await ctx.runMutation(internal.comments.markAutoReplyResult, {
        commentId: args.commentId,
        status: "failed",
        error: `${post.platform} is not connected for this post's owner`,
      });
      return;
    }

    let replyText: string;
    try {
      replyText = await generateReplyText({
        comment: comment.content,
        classification: comment.classification,
        postContent: post.content,
      });
    } catch (error) {
      await ctx.runMutation(internal.comments.markAutoReplyResult, {
        commentId: args.commentId,
        status: "failed",
        error: error instanceof Error ? error.message : "Failed to generate a reply",
      });
      return;
    }

    try {
      await ctx.runAction(internal.meta.postCommentReply, {
        platformCommentId: comment.platformCommentId,
        platform: comment.platform,
        accessToken: credentials.accessToken,
        message: replyText,
      });
      await ctx.runMutation(internal.comments.markAutoReplyResult, {
        commentId: args.commentId,
        status: "sent",
        text: replyText,
      });
    } catch (error) {
      await ctx.runMutation(internal.comments.markAutoReplyResult, {
        commentId: args.commentId,
        status: "failed",
        text: replyText,
        error: error instanceof Error ? error.message : "Failed to post the reply",
      });
    }
  },
});
