"use client";

import Link from "next/link";
import {
  ArrowLeft,
  ExternalLink,
  FileText,
  MessageCircleMore,
} from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import type { Doc } from "@/convex/_generated/dataModel";
import StatusPill from "@/components/hub/StatusPill";
import CommentList from "@/components/comments/CommentList";
import { PostAnalytics } from "@/components/analytics/PostAnalytics";
import {
  FacebookIcon,
  InstagramIcon,
  TwitterIcon,
} from "@/components/ui/ChannelIcons";

const platformIcons = {
  Facebook: FacebookIcon,
  Instagram: InstagramIcon,
  X: TwitterIcon,
};

export default function PostDetail({
  post,
  comments,
  userId,
  isOwnPost,
}: {
  post: Doc<"posts">;
  comments: Doc<"comments">[];
  userId: string;
  isOwnPost: boolean;
}) {
  const t = useTranslations("posts");
  const commentT = useTranslations("comments");
  const formatter = useFormatter();
  const PlatformIcon =
    platformIcons[post.platform as keyof typeof platformIcons] ?? FileText;
  const timestamp = post.publishedAt ?? post.scheduledAt ?? post.createdAt;

  return (
    <div className="space-y-8">
      <Link
        href="/posts"
        className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 transition hover:text-[#173b9a]"
      >
        <ArrowLeft className="rtl:rotate-180" size={16} />
        {t("backToPosts")}
      </Link>

      <section className="glass-card overflow-hidden rounded-3xl">
        <div className="h-1.5 bg-gradient-to-r from-[#173b9a] via-[#526ff2] to-[#a9ffe0]" />
        <div className="p-6 sm:p-8">
          <div className="flex flex-wrap items-start justify-between gap-5">
            <div className="flex min-w-0 items-start gap-4">
              <span className="grid h-12 w-12 flex-none place-items-center rounded-2xl bg-blue-50 text-[#3556d9]">
                <PlatformIcon className="h-5 w-5" />
              </span>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-semibold text-[#071e55]">
                    {post.platform}
                  </p>
                  <StatusPill value={post.status} />
                </div>
                <p className="mt-2 font-mono text-[0.65rem] text-slate-400">
                  {t("postId", { id: post._id })}
                </p>
              </div>
            </div>
            <div className="text-start sm:text-end">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">
                {t("savedDate")}
              </p>
              <p className="mt-1 text-sm text-slate-600">
                {formatter.dateTime(timestamp, {
                  dateStyle: "medium",
                  timeStyle: "short",
                })}
              </p>
            </div>
          </div>
          <p className="mt-7 max-w-4xl whitespace-pre-wrap text-base leading-8 text-slate-700">
            {post.content}
          </p>
          {post.postUrl && (
            <a
              href={post.postUrl}
              target="_blank"
              rel="noreferrer"
              className="mt-6 inline-flex items-center gap-2 rounded-xl bg-blue-50 px-4 py-2.5 text-sm font-semibold text-[#2854dc] transition hover:bg-blue-100"
            >
              <ExternalLink size={15} />
              {t("viewPost")}
            </a>
          )}
        </div>
      </section>

      <PostAnalytics postId={post._id} userId={userId} isOwnPost={isOwnPost} />

      <section>
        <div className="mb-4 flex items-start gap-3 px-1">
          <span className="grid h-10 w-10 flex-none place-items-center rounded-xl bg-cyan-50 text-cyan-700">
            <MessageCircleMore size={18} />
          </span>
          <div>
            <h2 className="text-xl font-semibold text-[#071e55]">
              {commentT("postComments")}
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              {commentT("postCommentsDescription")}
            </p>
          </div>
        </div>
        <CommentList
          comments={comments}
          posts={[post]}
          embedded
          useAdminDelete={!isOwnPost}
        />
      </section>
    </div>
  );
}
