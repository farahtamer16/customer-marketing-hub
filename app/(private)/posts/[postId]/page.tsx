"use client";

import { useMemo } from "react";
import { useParams } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { useQuery } from "convex/react";
import { Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import PostDetail from "@/components/posts/PostDetail";

export default function PostDetailPage() {
  const t = useTranslations("posts");
  const { postId } = useParams<{ postId: string }>();
  const { user, isLoaded } = useUser();
  const id = postId as Id<"posts">;
  const post = useQuery(api.posts.getPost, { postId: id });
  const comments = useQuery(
    api.comments.getCommentsForUser,
    user ? {} : "skip",
  );
  const relatedComments = useMemo(() => {
    if (!post || !comments) return [];
    const postUrl = normalizeUrl(post.postUrl);
    return comments.filter(
      (comment) =>
        comment.postId === post._id ||
        (Boolean(postUrl) && normalizeUrl(comment.targetUrl) === postUrl),
    );
  }, [comments, post]);

  if (!isLoaded || post === undefined || (user && comments === undefined)) {
    return (
      <div className="glass-card flex min-h-64 items-center justify-center rounded-3xl text-sm text-slate-500">
        <Loader2 className="me-2 animate-spin" size={18} />
        {t("loadingDetail")}
      </div>
    );
  }

  if (!user || !post || post.userId !== user.id) {
    return (
      <div className="glass-card rounded-3xl p-10 text-center text-sm text-slate-500">
        {t("notFound")}
      </div>
    );
  }

  return <PostDetail post={post} comments={relatedComments} userId={user.id} />;
}

function normalizeUrl(value?: string) {
  if (!value) return "";
  try {
    const url = new URL(value);
    return `${url.origin.toLocaleLowerCase()}${url.pathname.replace(/\/$/, "")}`;
  } catch {
    return value.trim().replace(/\/$/, "").toLocaleLowerCase();
  }
}
