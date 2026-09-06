"use client";

import { useUser } from "@clerk/nextjs";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import CommentList from "@/components/comments/CommentList";
import LoadingState from "@/components/ui/LoadingState";
import { useTranslations } from "next-intl";

export default function CommentsPage() {
  const t = useTranslations("comments");
  const { user } = useUser();
  const userId = user?.id;

  const comments = useQuery(
    api.comments.getCommentsForUser,
    userId ? {} : "skip",
  );
  const posts = useQuery(
    api.posts.getPostsForUser,
    userId ? {} : "skip",
  );

  if (comments === undefined || posts === undefined) {
    return <LoadingState label={t("loading")} />;
  }

  return <CommentList comments={comments} posts={posts} />;
}
