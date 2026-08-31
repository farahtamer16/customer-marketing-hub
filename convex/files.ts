import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// Standard Convex upload flow: client asks for a short-lived upload URL,
// POSTs the file to it directly, then calls finalizeUpload with the
// returned storageId to get a stable public URL (used as postUrl/mediaUrl
// and as the image_url the Meta Graph API fetches when publishing).
export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    return await ctx.storage.generateUploadUrl();
  },
});

export const finalizeUpload = mutation({
  args: { storageId: v.id("_storage") },
  handler: async (ctx, args) => {
    const url = await ctx.storage.getUrl(args.storageId);
    if (!url) throw new Error("Upload not found");
    return url;
  },
});

export const getUrl = query({
  args: { storageId: v.id("_storage") },
  handler: async (ctx, args) => {
    return await ctx.storage.getUrl(args.storageId);
  },
});
