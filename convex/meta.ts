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

// Creating an Instagram media container just queues Meta's servers to
// download and process the image — it isn't ready to publish immediately.
// Calling media_publish before it finishes returns "(#9007) Media ID is
// not available", which reads like a random intermittent failure (it
// depends on image size / how fast Meta processes it) but is really a
// missing wait step. Poll status_code until it's FINISHED before
// publishing, instead of firing media_publish right after creation.
async function waitForInstagramContainerReady(
  containerId: string,
  accessToken: string,
) {
  // Wait before checking, not after — a container is essentially never
  // ready on the very first check, so checking immediately just burns an
  // API call that (almost) always comes back "not ready yet."
  const maxAttempts = 5;
  const delayMs = 2000;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    await new Promise((resolve) => setTimeout(resolve, delayMs));
    const status = await graphGet(`/${containerId}`, {
      fields: "status_code",
      access_token: accessToken,
    });
    if (status.status_code === "FINISHED") return;
    if (status.status_code === "ERROR") {
      throw new Error("Instagram failed to process the uploaded image.");
    }
  }
  throw new Error(
    "Instagram is still processing the image — try publishing again in a moment.",
  );
}

// Meta has been consistently returning "(#4) Application request limit
// reached" on the media_publish call itself while the post still actually
// goes out on Instagram every time — not the intermittent behavior real
// throttling would produce. Rather than trust that response, check ground
// truth: look at the account's most recent media for something matching
// what was just attempted, published in roughly the last few minutes.
async function findJustPublishedInstagramMedia(
  igUserId: string,
  caption: string,
  accessToken: string,
) {
  const recent = await graphGet(`/${igUserId}/media`, {
    fields: "id,timestamp,caption,permalink",
    limit: "5",
    access_token: accessToken,
  });
  const items: Array<{
    id: string;
    timestamp: string;
    caption?: string;
    permalink?: string;
  }> = recent.data ?? [];
  const recentCutoff = Date.now() - 5 * 60 * 1000;
  return items.find(
    (item) =>
      item.caption === caption && new Date(item.timestamp).getTime() > recentCutoff,
  );
}

async function resolveImageUrl(ctx: ActionCtx, storageId?: Id<"_storage">) {
  if (!storageId) return undefined;
  const url = await ctx.storage.getUrl(storageId);
  if (!url) throw new Error("Uploaded image not found");
  return url;
}

// Public entry point — called directly from the browser. Publishing has to
// happen as whoever is actually signed in, never as a client-supplied id
// (that would let anyone publish "as" another workspace member just by
// passing their id), so this derives userId from the caller's own session
// and hands off to the internal action that does the real work.
export const publishFacebookPost = action({
  args: {
    content: v.string(),
    storageId: v.optional(v.id("_storage")),
  },
  handler: async (ctx, args): Promise<{ postId: Id<"posts">; postUrl: string }> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    return await ctx.runAction(internal.meta.publishFacebookPostAs, {
      userId: identity.subject,
      content: args.content,
      storageId: args.storageId,
    });
  },
});

// Internal — does the actual publish as a specific user. Not reachable from
// the browser at all (only other Convex functions can call it), so it's
// safe to trust userId here: the only callers are the public action above
// (which just derived it from a real session) and the approval-publish
// pipeline (which stores the submitter's id at submission time, also
// derived from their session, not from client input).
export const publishFacebookPostAs = internalAction({
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

    const postId: Id<"posts"> = await ctx.runMutation(internal.posts.recordPublishedPost, {
      userId: args.userId,
      platform: "Facebook",
      content: args.content,
      mediaUrl: imageUrl,
    });
    await ctx.runMutation(internal.posts.updatePostUrl, { postId, postUrl, platformPostId });

    return { postId, postUrl };
  },
});

// See publishFacebookPost above for why this is split into a public
// identity-deriving wrapper and an internal implementation.
export const publishInstagramPost = action({
  args: {
    caption: v.string(),
    storageId: v.id("_storage"),
  },
  handler: async (ctx, args): Promise<{ postId: Id<"posts">; postUrl: string }> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    return await ctx.runAction(internal.meta.publishInstagramPostAs, {
      userId: identity.subject,
      caption: args.caption,
      storageId: args.storageId,
    });
  },
});

export const publishInstagramPostAs = internalAction({
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
    await waitForInstagramContainerReady(created.id, credentials.accessToken);

    let platformPostId: string;
    let postUrl = `https://www.instagram.com/`;
    try {
      const published = await graphFetch(`/${credentials.platformAccountId}/media_publish`, {
        creation_id: created.id,
        access_token: credentials.accessToken,
      });
      platformPostId = published.id;
    } catch (publishError) {
      const reconciled = await findJustPublishedInstagramMedia(
        credentials.platformAccountId,
        args.caption,
        credentials.accessToken,
      ).catch(() => undefined);
      if (!reconciled) throw publishError;
      platformPostId = reconciled.id;
      if (reconciled.permalink) postUrl = reconciled.permalink;
    }

    if (postUrl === `https://www.instagram.com/`) {
      try {
        const permalink = await graphGet(`/${platformPostId}`, {
          fields: "permalink",
          access_token: credentials.accessToken,
        });
        if (permalink.permalink) postUrl = permalink.permalink;
      } catch {
        // permalink lookup is best-effort
      }
    }

    const postId: Id<"posts"> = await ctx.runMutation(internal.posts.recordPublishedPost, {
      userId: args.userId,
      platform: "Instagram",
      content: args.caption,
      mediaUrl: imageUrl,
    });
    await ctx.runMutation(internal.posts.updatePostUrl, { postId, postUrl, platformPostId });

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
        await waitForInstagramContainerReady(created.id, credentials.accessToken);
        try {
          const published = await graphFetch(`/${credentials.platformAccountId}/media_publish`, {
            creation_id: created.id,
            access_token: credentials.accessToken,
          });
          platformPostId = published.id;
          postUrl = `https://www.instagram.com/p/${platformPostId}/`;
        } catch (publishError) {
          const reconciled = await findJustPublishedInstagramMedia(
            credentials.platformAccountId,
            post.content,
            credentials.accessToken,
          ).catch(() => undefined);
          if (!reconciled) throw publishError;
          platformPostId = reconciled.id;
          postUrl = reconciled.permalink ?? `https://www.instagram.com/p/${platformPostId}/`;
        }
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

      await ctx.runMutation(internal.posts.markItemPublished, {
        postId: args.postId,
        postUrl,
        platformPostId,
      });
    } catch (error) {
      await ctx.runMutation(internal.posts.markItemFailed, {
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
    const duePosts = await ctx.runQuery(internal.posts.getScheduledItems, {});
    for (const post of duePosts) {
      await ctx.runMutation(internal.posts.markItemProcessing, { postId: post._id });
      await ctx.runAction(api.meta.publishScheduledPost, { postId: post._id });
    }
  },
});

// Identity is derived from the caller's own session, never trusted from an
// argument, and the post is verified to belong to that identity before its
// credentials or analytics are touched — otherwise anyone signed in could
// pass any postId and pull another teammate's engagement data.
export const fetchPostAnalytics = action({
  args: { postId: v.id("posts") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const post = await ctx.runQuery(api.posts.getPost, { postId: args.postId });
    if (!post || !post.platformPostId) throw new Error("Post has not been published yet");
    if (post.userId !== identity.subject) {
      throw new Error("You can only refresh analytics for your own posts");
    }

    const credentials = await ctx.runQuery(internal.socialAccounts.getMetaCredentials, {
      userId: identity.subject,
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

    const { reach, impressions } = await fetchInsights(
      post.platform,
      post.platformPostId,
      credentials.accessToken,
    );

    await ctx.runMutation(internal.analytics.recordAnalytics, {
      postId: args.postId,
      userId: identity.subject,
      platform: post.platform,
      likes,
      comments,
      shares,
      reach,
      impressions,
    });
    await ctx.runMutation(internal.posts.markAnalyticsCollected, { postId: args.postId });

    return { success: true, likes, comments, shares, reach, impressions };
  },
});

// Reach/impressions come from a separate Graph API edge (/insights) than
// likes/comments/shares, and it's flakier — Meta returns errors for posts
// below a minimum engagement/audience threshold, or with slightly different
// metric names/availability per API version. A failure here shouldn't sink
// the whole analytics refresh, since the base engagement numbers already
// succeeded by the time this runs — so this returns undefined instead of
// throwing.
async function fetchInsights(
  platform: string,
  platformPostId: string,
  accessToken: string,
): Promise<{ reach?: number; impressions?: number }> {
  try {
    if (platform === "Instagram") {
      const data = await graphGet(`/${platformPostId}/insights`, {
        metric: "impressions,reach",
        access_token: accessToken,
      });
      const byName = (name: string) =>
        data.data?.find((entry: { name: string }) => entry.name === name)
          ?.values?.[0]?.value;
      return { impressions: byName("impressions"), reach: byName("reach") };
    }

    const data = await graphGet(`/${platformPostId}/insights`, {
      metric: "post_impressions,post_impressions_unique",
      access_token: accessToken,
    });
    const byName = (name: string) =>
      data.data?.find((entry: { name: string }) => entry.name === name)
        ?.values?.[0]?.value;
    return {
      impressions: byName("post_impressions"),
      reach: byName("post_impressions_unique"),
    };
  } catch {
    return {};
  }
}

// Meta's API has no reliable way to resolve an arbitrary pasted post URL to
// a commentable Graph object id, so this only supports commenting on posts
// this workspace itself published and is tracking (posts.postUrl).
// Comparison is normalized (trim + drop a trailing slash) since different
// publish paths have historically stored postUrl with/without one.
function normalizeUrl(url: string) {
  return url.trim().replace(/\/+$/, "");
}

async function findOwnPostByUrl(ctx: ActionCtx, userId: string, targetUrl: string) {
  const posts = await ctx.runQuery(internal.posts.getPostsForUserInternal, { userId });
  const normalizedTarget = normalizeUrl(targetUrl);
  return {
    match: posts.find((post) => post.postUrl && normalizeUrl(post.postUrl) === normalizedTarget) ?? null,
    knownUrls: posts.filter((post) => post.postUrl).map((post) => post.postUrl as string),
  };
}

// Identity is derived from the caller's own session, never trusted from an
// argument — otherwise anyone signed in could post a comment through
// another teammate's connected Meta account.
export const publishCommentOnUrl = action({
  args: { targetUrl: v.string(), content: v.string() },
  handler: async (ctx, args): Promise<{ commentId: string }> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const { match: post, knownUrls } = await findOwnPostByUrl(ctx, identity.subject, args.targetUrl);
    if (!post || !post.platformPostId) {
      throw new Error(
        `This URL doesn't match one of your published posts. Commenting is only supported on posts published through this workspace.\nReceived: "${args.targetUrl}"\nKnown post URLs for this account: ${
          knownUrls.length ? knownUrls.map((u) => `"${u}"`).join(", ") : "(none — no post has a stored postUrl yet)"
        }`,
      );
    }

    const credentials = await ctx.runQuery(internal.socialAccounts.getMetaCredentials, {
      userId: identity.subject,
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
    const dueComments = await ctx.runQuery(internal.comments.getScheduledComments, {});
    for (const comment of dueComments) {
      await ctx.runMutation(internal.comments.markCommentProcessing, { commentId: comment._id });
      try {
        const { match: post } = await findOwnPostByUrl(ctx, comment.userId, comment.targetUrl);
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
        await ctx.runMutation(internal.comments.markCommentPublished, { commentId: comment._id });
      } catch (error) {
        await ctx.runMutation(internal.comments.markCommentFailed, {
          commentId: comment._id,
          error: error instanceof Error ? error.message : "Failed to publish comment",
        });
      }
    }
  },
});

// Inspects the actual stored Page access token via Meta's /debug_token
// endpoint — never returns the token itself, only what it's allowed to do.
// Use this instead of guessing when a Graph API call fails with a
// permission error: it shows exactly which scopes the live token carries
// and whether it's expired, which the OAuth consent screen alone can't
// tell you (a scope can be requested and shown as granted there, and still
// not end up on the resulting Page token).
export type DebugConnectionResult =
  | { connected: false }
  | { connected: true; error: string }
  | {
      connected: true;
      platformAccountId: string;
      isValid: boolean;
      expiresAt: number | null;
      dataAccessExpiresAt: number | null;
      scopes: string[];
      tokenError?: string;
    };

export const debugConnection = action({
  args: {
    platform: v.union(v.literal("Facebook"), v.literal("Instagram")),
  },
  handler: async (ctx, args): Promise<DebugConnectionResult> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const credentials = await ctx.runQuery(internal.socialAccounts.getMetaCredentials, {
      userId: identity.subject,
      platform: args.platform,
    });
    if (!credentials) return { connected: false };

    const appId = process.env.META_APP_ID;
    const appSecret = process.env.META_APP_SECRET;
    if (!appId || !appSecret) {
      return {
        connected: true,
        error: "META_APP_ID / META_APP_SECRET is not configured on the server",
      };
    }

    try {
      const debug = await graphGet("/debug_token", {
        input_token: credentials.accessToken,
        access_token: `${appId}|${appSecret}`,
      });
      const info = debug.data ?? {};
      return {
        connected: true,
        platformAccountId: credentials.platformAccountId,
        isValid: Boolean(info.is_valid),
        expiresAt: info.expires_at ? info.expires_at * 1000 : null,
        dataAccessExpiresAt: info.data_access_expires_at
          ? info.data_access_expires_at * 1000
          : null,
        scopes: (info.scopes as string[] | undefined) ?? [],
        tokenError: info.error?.message as string | undefined,
      };
    } catch (error) {
      return {
        connected: true as const,
        error: error instanceof Error ? error.message : "Failed to inspect token",
      };
    }
  },
});

export const fetchPostComments = action({
  args: { postId: v.id("posts") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const post = await ctx.runQuery(api.posts.getPost, { postId: args.postId });
    if (!post || !post.platformPostId) throw new Error("Post has not been published yet");
    if (post.userId !== identity.subject) {
      throw new Error("You can only fetch comments for your own posts");
    }

    const credentials = await ctx.runQuery(internal.socialAccounts.getMetaCredentials, {
      userId: identity.subject,
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
