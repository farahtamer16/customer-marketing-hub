"use client";

import { useUser } from "@clerk/nextjs";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import PostList from "@/components/posts/PostList";
import LoadingState from "@/components/ui/LoadingState";
import { useTranslations } from "next-intl";

export default function PostsPage() {
  const t = useTranslations("posts");
  const { user } = useUser();
  const userId = user?.id;

  const posts = useQuery(
    api.posts.getPostsForUser,
    userId ? {} : "skip",
  );

  if (posts === undefined) {
    return <LoadingState label={t("loading")} />;
  }

  return <PostList posts={posts} />;
}
