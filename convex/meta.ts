import { action, internalAction } from "./_generated/server";
import { v } from "convex/values";
import { api, internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import type { ActionCtx } from "./_generated/server";

// Meta (Facebook/Instagram) Graph API version. Meta deprecates versions on a
// rolling schedule — bump this if calls start failing with an
// "unsupported version" error. See https://developers.facebook.com/docs/graph-api/changelog
const GRAPH_VERSION = "v21.0";
const GRAPH_URL = `https://graph.facebook.com/${GRAPH_VERSION}`;

async function graphFetch(path: string, params: Record<string, string>) {
  const url = new URL(`${GRAPH_URL}${path}`);
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);
  const response = await fetch(url.toString(), { method: "POST" });
  const data = await response.json();
  if (!response.ok || data.error) {
    throw new Error(data.error?.message ?? `Graph API request failed (${response.status})`);
  }
  return data;
}

async function graphGet(path: string, params: Record<string, string>) {
  const url = new URL(`${GRAPH_URL}${path}`);
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);
  const response = await fetch(url.toString());
  const data = await response.json();
  if (!response.ok || data.error) {
    throw new Error(data.error?.message ?? `Graph API request failed (${response.status})`);
  }
  return data;
}

async function resolveImageUrl(ctx: ActionCtx, storageId?: Id<"_storage">) {
  if (!storageId) return undefined;
  const url = await ctx.storage.getUrl(storageId);
  if (!url) throw new Error("Uploaded image not found");
  return url;
}

export const publishFacebookPost = action({
  args: {
    userId: v.string(),
    content: v.string(),
    storageId: v.optional(v.id("_storage")),
  },
  handler: async (ctx, args): Promise<{ postId: Id<"posts">; postUrl: string }> => {
    const credentials = await ctx.runQuery(internal.socialAccounts.getMetaCredentials, {
      userId: args.userId,
      platform: "Facebook",
    });
    if (!credentials) throw new Error("Facebook is not connected");

    const imageUrl = await resolveImageUrl(ctx, args.storageId);
    const result = imageUrl
      ? await graphFetch(`/${credentials.platformAccountId}/photos`, {
          url: imageUrl,
          caption: args.content,
          access_token: credentials.accessToken,
        })
      : await graphFetch(`/${credentials.platformAccountId}/feed`, {
          message: args.content,
          access_token: credentials.accessToken,
        });

    const platformPostId: string = result.post_id ?? result.id;
    const postUrl = `https://www.facebook.com/${platformPostId}`;

    const postId: Id<"posts"> = await ctx.runMutation(api.posts.recordPublishedPost, {
      userId: args.userId,
      platform: "Facebook",
      content: args.content,
      mediaUrl: imageUrl,
    });
    await ctx.runMutation(api.posts.updatePostUrl, { postId, postUrl, platformPostId });

    return { postId, postUrl };
  },
});

export const publishInstagramPost = action({
  args: {
    userId: v.string(),
    caption: v.string(),
    storageId: v.id("_storage"),
  },
  handler: async (ctx, args): Promise<{ postId: Id<"posts">; postUrl: string }> => {
    const credentials = await ctx.runQuery(internal.socialAccounts.getMetaCredentials, {
      userId: args.userId,
      platform: "Instagram",
    });
    if (!credentials) throw new Error("Instagram is not connected");

    const imageUrl = await resolveImageUrl(ctx, args.storageId);
    if (!imageUrl) throw new Error("An image is required to publish to Instagram");

    const created = await graphFetch(`/${credentials.platformAccountId}/media`, {
      image_url: imageUrl,
      caption: args.caption,
      access_token: credentials.accessToken,
    });
    const published = await graphFetch(`/${credentials.platformAccountId}/media_publish`, {
      creation_id: created.id,
      access_token: credentials.accessToken,
    });

    const platformPostId: string = published.id;
    let postUrl = `https://www.instagram.com/`;
    try {
      const permalink = await graphGet(`/${platformPostId}`, {
        fields: "permalink",
        access_token: credentials.accessToken,
      });
      if (permalink.permalink) postUrl = permalink.permalink;
    } catch {
      // permalink lookup is best-effort
    }

    const postId: Id<"posts"> = await ctx.runMutation(api.posts.recordPublishedPost, {
      userId: args.userId,
      platform: "Instagram",
      content: args.caption,
      mediaUrl: imageUrl,
    });
    await ctx.runMutation(api.posts.updatePostUrl, { postId, postUrl, platformPostId });

    return { postId, postUrl };
  },
});

// Called by the cron in convex/crons.ts to publish a post whose scheduledAt
// has arrived.
export const publishScheduledPost = action({
  args: { postId: v.id("posts") },
  handler: async (ctx, args) => {
    const post = await ctx.runQuery(api.posts.getPost, { postId: args.postId });
    if (!post || post.status !== "Processing") return;

    try {
      const credentials = await ctx.runQuery(internal.socialAccounts.getMetaCredentials, {
        userId: post.userId,
        platform: post.platform === "Instagram" ? "Instagram" : "Facebook",
      });
      if (!credentials) throw new Error(`${post.platform} is not connected`);

      let platformPostId: string;
      let postUrl: string;

      if (post.platform === "Instagram") {
        if (!post.mediaUrl) throw new Error("An image is required to publish to Instagram");
        const created = await graphFetch(`/${credentials.platformAccountId}/media`, {
          image_url: post.mediaUrl,
          caption: post.content,
          access_token: credentials.accessToken,
        });
        const published = await graphFetch(`/${credentials.platformAccountId}/media_publish`, {
          creation_id: created.id,
          access_token: credentials.accessToken,
        });
        platformPostId = published.id;
        postUrl = `https://www.instagram.com/p/${platformPostId}/`;
      } else {
        const result = post.mediaUrl
          ? await graphFetch(`/${credentials.platformAccountId}/photos`, {
              url: post.mediaUrl,
              caption: post.content,
              access_token: credentials.accessToken,
            })
          : await graphFetch(`/${credentials.platformAccountId}/feed`, {
              message: post.content,
              access_token: credentials.accessToken,
            });
        platformPostId = result.post_id ?? result.id;
        postUrl = `https://www.facebook.com/${platformPostId}`;
      }

      await ctx.runMutation(api.posts.markItemPublished, {
        postId: args.postId,
        postUrl,
        platformPostId,
      });
    } catch (error) {
      await ctx.runMutation(api.posts.markItemFailed, {
        postId: args.postId,
        error: error instanceof Error ? error.message : "Failed to publish",
      });
    }
  },
});

// Runs on a schedule (convex/crons.ts) — picks up posts whose scheduledAt
// has arrived and publishes each one via publishScheduledPost.
export const processDuePosts = internalAction({
  args: {},
  handler: async (ctx) => {
    const duePosts = await ctx.runQuery(api.posts.getScheduledItems, {});
    for (const post of duePosts) {
      await ctx.runMutation(api.posts.markItemProcessing, { postId: post._id });
      await ctx.runAction(api.meta.publishScheduledPost, { postId: post._id });
    }
  },
});

export const fetchPostAnalytics = action({
  args: { userId: v.string(), postId: v.id("posts") },
  handler: async (ctx, args) => {
    const post = await ctx.runQuery(api.posts.getPost, { postId: args.postId });
    if (!post || !post.platformPostId) throw new Error("Post has not been published yet");

    const credentials = await ctx.runQuery(internal.socialAccounts.getMetaCredentials, {
      userId: args.userId,
      platform: post.platform === "Instagram" ? "Instagram" : "Facebook",
    });
    if (!credentials) throw new Error(`${post.platform} is not connected`);

    let likes = 0;
    let comments = 0;
    let shares = 0;

    if (post.platform === "Instagram") {
      const data = await graphGet(`/${post.platformPostId}`, {
        fields: "like_count,comments_count",
        access_token: credentials.accessToken,
      });
      likes = data.like_count ?? 0;
      comments = data.comments_count ?? 0;
    } else {
      const data = await graphGet(`/${post.platformPostId}`, {
        fields: "likes.summary(true),comments.summary(true),shares",
        access_token: credentials.accessToken,
      });
      likes = data.likes?.summary?.total_count ?? 0;
      comments = data.comments?.summary?.total_count ?? 0;
      shares = data.shares?.count ?? 0;
    }

    await ctx.runMutation(api.analytics.recordAnalytics, {
      postId: args.postId,
      userId: args.userId,
      platform: post.platform,
      likes,
      comments,
      shares,
    });
    await ctx.runMutation(api.posts.markAnalyticsCollected, { postId: args.postId });

    return { success: true, likes, comments, shares };
  },
});

// Meta's API has no reliable way to resolve an arbitrary pasted post URL to
// a commentable Graph object id, so this only supports commenting on posts
// this workspace itself published and is tracking (posts.postUrl).
async function findOwnPostByUrl(ctx: ActionCtx, userId: string, targetUrl: string) {
  const posts = await ctx.runQuery(api.posts.getPostsForUser, { userId });
  return posts.find((post) => post.postUrl === targetUrl) ?? null;
}

export const publishCommentOnUrl = action({
  args: { userId: v.string(), targetUrl: v.string(), content: v.string() },
  handler: async (ctx, args): Promise<{ commentId: string }> => {
    const post = await findOwnPostByUrl(ctx, args.userId, args.targetUrl);
    if (!post || !post.platformPostId) {
      throw new Error(
        "This URL doesn't match one of your published posts. Commenting is only supported on posts published through this workspace.",
      );
    }

    const credentials = await ctx.runQuery(internal.socialAccounts.getMetaCredentials, {
      userId: args.userId,
      platform: post.platform === "Instagram" ? "Instagram" : "Facebook",
    });
    if (!credentials) throw new Error(`${post.platform} is not connected`);

    const result = await graphFetch(`/${post.platformPostId}/comments`, {
      message: args.content,
      access_token: credentials.accessToken,
    });
    return { commentId: result.id };
  },
});

export const processDueComments = internalAction({
  args: {},
  handler: async (ctx) => {
    const dueComments = await ctx.runQuery(api.comments.getScheduledComments, {});
    for (const comment of dueComments) {
      await ctx.runMutation(api.comments.markCommentProcessing, { commentId: comment._id });
      try {
        const post = await findOwnPostByUrl(ctx, comment.userId, comment.targetUrl);
        if (!post || !post.platformPostId) {
          throw new Error("Target post is not one of this workspace's published posts");
        }
        const credentials = await ctx.runQuery(internal.socialAccounts.getMetaCredentials, {
          userId: comment.userId,
          platform: comment.platform === "instagram" ? "Instagram" : "Facebook",
        });
        if (!credentials) throw new Error(`${comment.platform} is not connected`);

        await graphFetch(`/${post.platformPostId}/comments`, {
          message: comment.content,
          access_token: credentials.accessToken,
        });
        await ctx.runMutation(api.comments.markCommentPublished, { commentId: comment._id });
      } catch (error) {
        await ctx.runMutation(api.comments.markCommentFailed, {
          commentId: comment._id,
          error: error instanceof Error ? error.message : "Failed to publish comment",
        });
      }
    }
  },
});

export const fetchPostComments = action({
  args: { userId: v.string(), postId: v.id("posts") },
  handler: async (ctx, args) => {
    const post = await ctx.runQuery(api.posts.getPost, { postId: args.postId });
    if (!post || !post.platformPostId) throw new Error("Post has not been published yet");

    const credentials = await ctx.runQuery(internal.socialAccounts.getMetaCredentials, {
      userId: args.userId,
      platform: post.platform === "Instagram" ? "Instagram" : "Facebook",
    });
    if (!credentials) throw new Error(`${post.platform} is not connected`);

    const fields = post.platform === "Instagram" ? "username,text,timestamp" : "from,message,created_time";
    const data = await graphGet(`/${post.platformPostId}/comments`, {
      fields,
      access_token: credentials.accessToken,
    });

    const comments = (data.data ?? []).map((raw: Record<string, unknown>) => ({
      authorName:
        post.platform === "Instagram"
          ? (raw.username as string | undefined)
          : ((raw.from as { name?: string } | undefined)?.name),
      content: (raw.message ?? raw.text) as string | undefined,
      createdAt: (raw.created_time ?? raw.timestamp) as string | undefined,
      platform: post.platform === "Instagram" ? "instagram" : "facebook",
    }));

    return { success: true, comments };
  },
});
