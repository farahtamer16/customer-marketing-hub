"use client";

import { useUser } from "@clerk/nextjs";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import CommentList from "@/components/comments/CommentList";
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
    return <div className="p-8 text-gray-500">{t("loading")}</div>;
  }

  return <CommentList comments={comments} posts={posts} />;
}
