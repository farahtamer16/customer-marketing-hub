"use client";

import { useParams } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { useQuery } from "convex/react";
import { useTranslations } from "next-intl";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import PostDetail from "@/components/posts/PostDetail";
import LoadingState from "@/components/ui/LoadingState";

export default function PostDetailPage() {
  const t = useTranslations("posts");
  const { postId } = useParams<{ postId: string }>();
  const { user, isLoaded } = useUser();
  const id = postId as Id<"posts">;
  // getPost already only ever returns a post in the caller's own
  // workspace (or null otherwise) — so by the time we have `post` here,
  // the caller is already known to be allowed to see it, whether or not
  // it's actually theirs. Any teammate can view any other teammate's post
  // the same way Content Studio already does for lists.
  const post = useQuery(api.posts.getPost, { postId: id });
  const comments = useQuery(api.comments.getCommentsForPost, { postId: id });

  if (!isLoaded || post === undefined || comments === undefined) {
    return <LoadingState label={t("loadingDetail")} />;
  }

  if (!user || !post) {
    return (
      <div className="glass-card rounded-3xl p-10 text-center text-sm text-slate-500">
        {t("notFound")}
      </div>
    );
  }

  return (
    <PostDetail
      post={post}
      comments={comments}
      userId={user.id}
      isOwnPost={post.userId === user.id}
      authorName={post.authorName}
    />
  );
}
