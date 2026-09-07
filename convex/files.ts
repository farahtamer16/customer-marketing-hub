import { mutation } from "./_generated/server";
import { v } from "convex/values";
import { requireMember } from "./authz";

// Standard Convex upload flow: client asks for a short-lived upload URL,
// POSTs the file to it directly, then calls finalizeUpload with the
// returned storageId to get a stable public URL (used as postUrl/mediaUrl
// and as the image_url the Meta Graph API fetches when publishing).
// Both steps just require being a signed-in team member — there's no
// workspace-scoped document yet to check against at this point, the file
// isn't attached to anything until the caller saves the returned URL onto
// a post or approval draft.
export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    await requireMember(ctx);
    return await ctx.storage.generateUploadUrl();
  },
});

export const finalizeUpload = mutation({
  args: { storageId: v.id("_storage") },
  handler: async (ctx, args) => {
    await requireMember(ctx);
    const url = await ctx.storage.getUrl(args.storageId);
    if (!url) throw new Error("Upload not found");
    return url;
  },
});
