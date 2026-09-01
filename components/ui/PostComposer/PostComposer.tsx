"use client";

import { useEffect, useRef, useState } from "react";
import { useUser } from "@clerk/nextjs";
import { useQuery } from "convex/react";
import { PostComposerHeader } from "./PostComposerHeader";
import {
  ChannelSelector,
  COMPOSER_CHANNELS,
  type ComposerChannelId,
} from "./ChannelSelector";
import { ContentEditor } from "./ContentEditor";
import { PreviewSidebar } from "./PreviewSidebar";
import { PostComposerFooter } from "./PostComposerFooter";
import { AIAssistantPanel } from "./AIAssistantPanel";
import { CalendarIcon, Link2 } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/convex/_generated/api";
import { type Platform } from "@/types/social-account";
import { useTranslations } from "next-intl";

interface PostComposerProps {
  isOpen: boolean;
  onClose: () => void;
  onPost?: (
    content: string,
    platforms: Platform[],
    targetUrl?: string,
    image?: File,
  ) => void;
  onSchedule?: (
    content: string,
    scheduledAt: number,
    platforms: Platform[],
    targetUrl?: string,
    image?: File,
  ) => void;
  onSubmitForApproval?: (
    content: string,
    platforms: Platform[],
    image?: File,
  ) => void;
  isPosting?: boolean;
  isScheduling?: boolean;
  isSubmittingForApproval?: boolean;
  mode?: "post" | "comment";
  initialTargetUrl?: string;
}

export function PostComposer({
  isOpen,
  onClose,
  onPost,
  onSchedule,
  onSubmitForApproval,
  isPosting = false,
  isScheduling = false,
  isSubmittingForApproval = false,
  mode = "post",
  initialTargetUrl = "",
}: PostComposerProps) {
  const t = useTranslations("composer");
  const [selectedChannels, setSelectedChannels] = useState<ComposerChannelId[]>(
    [],
  );
  const [content, setContent] = useState("");
  const [image, setImage] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);
  const [scheduledTime, setScheduledTime] = useState<string>("");
  const [showScheduler, setShowScheduler] = useState(false);
  const [targetUrl, setTargetUrl] = useState(initialTargetUrl);

  const backdropRef = useRef<HTMLDivElement>(null);
  const imagePreviewUrlRef = useRef<string | null>(null);

  const { user } = useUser();
  const ownPosts = useQuery(
    api.posts.getPostsForUser,
    mode === "comment" && user ? { userId: user.id } : "skip",
  );

  const selectedChannelConfigs = COMPOSER_CHANNELS.filter((item) =>
    selectedChannels.includes(item.id),
  );
  const channel = selectedChannelConfigs[0];
  const ChannelIcon = channel?.icon;
  const targetChannelName = channel?.label ?? t("socialMedia");
  const commentablePosts = (ownPosts ?? []).filter(
    (post) =>
      post.status === "Published" &&
      Boolean(post.postUrl) &&
      (!channel || post.platform === channel.platform),
  );

  const handleChannelToggle = (id: ComposerChannelId) => {
    setSelectedChannels((current) => {
      if (mode === "comment") return current.includes(id) ? [] : [id];
      return current.includes(id)
        ? current.filter((channelId) => channelId !== id)
        : [...current, id];
    });
  };

  useEffect(
    () => () => {
      if (imagePreviewUrlRef.current) {
        URL.revokeObjectURL(imagePreviewUrlRef.current);
      }
    },
    [],
  );

  const handleImageSelect = (selectedImage: File) => {
    if (imagePreviewUrlRef.current) {
      URL.revokeObjectURL(imagePreviewUrlRef.current);
    }
    const objectUrl = URL.createObjectURL(selectedImage);
    imagePreviewUrlRef.current = objectUrl;
    setImage(selectedImage);
    setImagePreviewUrl(objectUrl);
  };

  const handleImageRemove = () => {
    if (imagePreviewUrlRef.current) {
      URL.revokeObjectURL(imagePreviewUrlRef.current);
      imagePreviewUrlRef.current = null;
    }
    setImage(null);
    setImagePreviewUrl(null);
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === backdropRef.current) onClose();
  };

  const handleTogglePreview = () => {
    if (previewOpen) {
      setPreviewOpen(false);
    } else {
      setPreviewOpen(true);
      setAiOpen(false);
    }
  };

  const handleToggleAI = () => {
    if (aiOpen) {
      setAiOpen(false);
    } else {
      setAiOpen(true);
      setPreviewOpen(false);
    }
  };
  const handlePost = () => {
    if (onPost && content.trim()) {
      const platforms = selectedChannelConfigs.map((item) => item.platform);
      onPost(
        content,
        platforms,
        mode === "comment" ? targetUrl : undefined,
        image ?? undefined,
      );
    }
  };

  const handleSubmitForApproval = () => {
    if (onSubmitForApproval && content.trim()) {
      const platforms = selectedChannelConfigs.map((item) => item.platform);
      onSubmitForApproval(content, platforms, image ?? undefined);
    }
  };

  const handleSchedule = () => {
    if (!scheduledTime) {
      toast.error(t("selectDate"));
      return;
    }
    const timestamp = new Date(scheduledTime).getTime();
    if (timestamp <= Date.now()) {
      toast.error(t("futureDate"));
      return;
    }
    if (onSchedule && content.trim()) {
      const platforms = selectedChannelConfigs.map((item) => item.platform);
      onSchedule(
        content,
        timestamp,
        platforms,
        mode === "comment" ? targetUrl : undefined,
        image ?? undefined,
      );
      setShowScheduler(false);
      setScheduledTime("");
      if (mode === "comment") setTargetUrl("");
    }
  };

  if (!isOpen) return null;

  return (
    <div
      ref={backdropRef}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
      onClick={handleBackdropClick}
    >
      <div
        className={`relative flex max-h-[calc(100dvh-2rem)] min-h-0 w-[90vw] flex-col overflow-hidden rounded-lg bg-white shadow-2xl transition-all duration-200 ${
          previewOpen ? "max-w-6xl" : "max-w-3xl"
        }`}
      >
        <PostComposerHeader
          mode={mode}
          previewOpen={previewOpen}
          onTogglePreview={handleTogglePreview}
          aiOpen={aiOpen}
          onToggleAI={handleToggleAI}
          onClose={onClose}
        />

        <div className="flex min-h-0 flex-1 overflow-hidden">
          <div className="flex min-h-0 flex-1 flex-col overflow-y-auto p-6">
            <ChannelSelector
              selected={selectedChannels}
              onToggle={handleChannelToggle}
              multiple={mode === "post"}
            />

            {mode === "comment" && (
              <div className="mb-4">
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                  {targetChannelName} · {t("targetUrl")}
                </label>
                {!channel ? (
                  <p className="rounded-md bg-slate-50 px-4 py-3 text-sm text-slate-500">
                    {t("selectChannelFirst")}
                  </p>
                ) : ownPosts === undefined ? (
                  <p className="rounded-md bg-slate-50 px-4 py-3 text-sm text-slate-500">
                    {t("loadingPosts")}
                  </p>
                ) : commentablePosts.length === 0 ? (
                  <p className="rounded-md bg-amber-50 px-4 py-3 text-sm text-amber-800">
                    {t("noCommentablePosts", { channel: targetChannelName })}
                  </p>
                ) : (
                  <div className="relative">
                    <select
                      value={targetUrl}
                      onChange={(e) => setTargetUrl(e.target.value)}
                      className="w-full appearance-none border border-gray-200 rounded-md focus-within:ring-2 focus-within:ring-blue-500 px-4 py-3 pl-10"
                    >
                      <option value="" disabled>
                        {t("selectPost")}
                      </option>
                      {commentablePosts.map((post) => (
                        <option key={post._id} value={post.postUrl}>
                          {post.content.slice(0, 60)}
                        </option>
                      ))}
                    </select>
                    <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  </div>
                )}
                <p className="mt-1.5 text-xs text-gray-400">{t("pasteLink")}</p>
              </div>
            )}
            <ContentEditor
              value={content}
              onChange={setContent}
              image={image}
              imagePreviewUrl={imagePreviewUrl}
              onImageSelect={mode === "post" ? handleImageSelect : undefined}
              onImageRemove={mode === "post" ? handleImageRemove : undefined}
            />

            <div className="mt-4">
              <button
                onClick={() => setShowScheduler(!showScheduler)}
                className="text-sm text-blue-600 hover:underline flex items-center gap-1"
              >
                <CalendarIcon className="w-4 h-4" />
                {showScheduler ? t("cancelSchedule") : t("scheduleLater")}
              </button>
              {showScheduler && (
                <div className="mt-2 p-3 border rounded-lg flex items-center gap-3">
                  <input
                    type="datetime-local"
                    value={scheduledTime}
                    onChange={(e) => setScheduledTime(e.target.value)}
                    className="border rounded px-2 py-1 text-sm"
                  />
                  <button
                    onClick={handleSchedule}
                    disabled={!scheduledTime || isScheduling}
                    className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                  >
                    {isScheduling ? t("scheduling") : t("confirmSchedule")}
                  </button>
                </div>
              )}
            </div>
          </div>

          {previewOpen && !aiOpen && (
            <PreviewSidebar
              content={content}
              channels={selectedChannels}
              imageUrl={imagePreviewUrl}
            />
          )}
          {aiOpen && !previewOpen && (
            <AIAssistantPanel
              isOpen={aiOpen}
              onClose={handleToggleAI}
              onApplyContent={setContent}
              channel={
                selectedChannelConfigs.map((item) => item.label).join(" & ") ||
                "Facebook"
              }
              channelIcon={
                selectedChannelConfigs.length === 1 && ChannelIcon ? (
                  <ChannelIcon className="h-4 w-4" />
                ) : null
              }
              mode={mode}
            />
          )}
        </div>

        <PostComposerFooter
          selectedCount={selectedChannels.length}
          onPost={handlePost}
          isPosting={isPosting}
          isDisabled={
            !content.trim() ||
            selectedChannels.length === 0 ||
            (mode === "comment" && !targetUrl.trim())
          }
          onSubmitForApproval={
            mode === "post" && onSubmitForApproval ? handleSubmitForApproval : undefined
          }
          isSubmittingForApproval={isSubmittingForApproval}
        />
      </div>
    </div>
  );
}
