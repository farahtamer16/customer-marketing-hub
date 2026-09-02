"use client";

import { useState } from "react";
import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useAction, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { toast } from "sonner";
import { PostComposer } from "@/components/ui/PostComposer/PostComposer";
import { type Platform } from "@/types/social-account";
import { useTranslations } from "next-intl";

const formatPlatforms = (platforms: Platform[]) => platforms.join(" & ");

export default function CreatePage() {
  const t = useTranslations("composer");
  const router = useRouter();
  const { user } = useUser();
  const userId = user?.id;

  const [isPosting, setIsPosting] = useState(false);
  const [isScheduling, setIsScheduling] = useState(false);
  const [isSubmittingForApproval, setIsSubmittingForApproval] = useState(false);

  const generateUploadUrl = useMutation(api.files.generateUploadUrl);
  const finalizeUpload = useMutation(api.files.finalizeUpload);
  const schedulePost = useMutation(api.posts.schedulePost);
  const createApprovalPost = useMutation(api.approvals.createPost);
  const publishFacebookPost = useAction(api.meta.publishFacebookPost);
  const publishInstagramPost = useAction(api.meta.publishInstagramPost);

  const uploadImage = async (image: File) => {
    const uploadUrl = await generateUploadUrl();
    const response = await fetch(uploadUrl, {
      method: "POST",
      headers: { "Content-Type": image.type },
      body: image,
    });
    if (!response.ok) throw new Error("Failed to upload image");
    const { storageId } = await response.json();
    return storageId as Id<"_storage">;
  };

  const handlePost = async (
    content: string,
    platforms: Platform[],
    _targetUrl?: string,
    image?: File,
  ) => {
    if (!userId) {
      toast.error(t("loginRequired"));
      return;
    }
    if (platforms.length === 0) {
      toast.error(t("channelRequired"));
      return;
    }
    if (platforms.includes("Instagram") && !image) {
      toast.error(t("instagramImageRequired"));
      return;
    }

    const platformLabel = formatPlatforms(platforms);
    setIsPosting(true);
    const loadingToast = toast.loading(
      t("publishing", { platforms: platformLabel }),
    );

    try {
      const storageId = image ? await uploadImage(image) : undefined;

      const results = await Promise.allSettled(
        platforms.map(async (platform) => {
          if (platform === "Instagram") {
            if (!storageId) throw new Error(t("instagramImageRequired"));
            await publishInstagramPost({ caption: content, storageId });
          } else if (platform === "Facebook") {
            await publishFacebookPost({ content, storageId });
          } else {
            throw new Error(t("publishFailed", { platform }));
          }
          return platform;
        }),
      );

      toast.dismiss(loadingToast);
      const publishedPlatforms = results.flatMap((result) =>
        result.status === "fulfilled" ? [result.value] : [],
      );
      const failures = results.flatMap((result, index) =>
        result.status === "rejected"
          ? [
              `${platforms[index]}: ${
                result.reason instanceof Error
                  ? result.reason.message
                  : String(result.reason)
              }`,
            ]
          : [],
      );

      if (publishedPlatforms.length > 0) {
        toast.success(
          t("published", { platforms: formatPlatforms(publishedPlatforms) }),
        );
      }
      failures.forEach((failure) => toast.error(failure));
      if (failures.length === 0) router.push("/home");
    } catch (error) {
      toast.dismiss(loadingToast);
      toast.error((error as Error).message);
    } finally {
      setIsPosting(false);
    }
  };

  const handleSchedule = async (
    content: string,
    scheduledAt: number,
    platforms: Platform[],
    _targetUrl?: string,
    image?: File,
  ) => {
    if (!userId) {
      toast.error(t("loginRequired"));
      return;
    }
    if (platforms.length === 0) {
      toast.error(t("channelRequired"));
      return;
    }
    if (platforms.includes("Instagram") && !image) {
      toast.error(t("instagramImageRequired"));
      return;
    }

    const platformLabel = formatPlatforms(platforms);
    setIsScheduling(true);
    const loadingToast = toast.loading(
      t("schedulingOn", { platforms: platformLabel }),
    );

    try {
      let mediaUrl: string | undefined;
      if (image) {
        const storageId = await uploadImage(image);
        mediaUrl = await finalizeUpload({ storageId });
      }

      for (const platform of platforms) {
        await schedulePost({
          content,
          scheduledAt,
          platform,
          mediaUrl,
        });
      }

      toast.dismiss(loadingToast);
      toast.success(t("scheduledOn", { platforms: platformLabel }));
      router.push("/home");
    } catch (error) {
      toast.dismiss(loadingToast);
      toast.error((error as Error).message);
    } finally {
      setIsScheduling(false);
    }
  };

  const handleSubmitForApproval = async (
    content: string,
    platforms: Platform[],
    image?: File,
  ) => {
    if (!userId) {
      toast.error(t("loginRequired"));
      return;
    }
    const channels = platforms
      .filter((platform): platform is "Facebook" | "Instagram" =>
        platform === "Facebook" || platform === "Instagram",
      )
      .map((platform) => platform.toLowerCase() as "facebook" | "instagram");
    if (channels.length === 0) {
      toast.error(t("approvalChannelsUnsupported"));
      return;
    }
    if (channels.includes("instagram") && !image) {
      toast.error(t("instagramImageRequired"));
      return;
    }

    setIsSubmittingForApproval(true);
    try {
      const storageId = image ? await uploadImage(image) : undefined;
      await createApprovalPost({
        author: user?.fullName ?? user?.username ?? "Workspace member",
        campaign: content.length > 60 ? `${content.slice(0, 57)}...` : content,
        content,
        channels,
        priority: "standard",
        storageId,
        steps: [
          { id: crypto.randomUUID(), role: "ownerAdmin", assignee: t("workspaceOwner") },
        ],
      });
      toast.success(t("submittedForApproval"));
      router.push("/growth/approvals");
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setIsSubmittingForApproval(false);
    }
  };

  const handleClose = () => {
    router.push("/home");
  };

  return (
    <PostComposer
      isOpen={true}
      onClose={handleClose}
      onPost={handlePost}
      onSchedule={handleSchedule}
      onSubmitForApproval={handleSubmitForApproval}
      isPosting={isPosting}
      isScheduling={isScheduling}
      isSubmittingForApproval={isSubmittingForApproval}
    />
  );
}
