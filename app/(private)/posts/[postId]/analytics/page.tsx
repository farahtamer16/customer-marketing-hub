"use client";

import { useParams } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { PostAnalytics } from "../../../../../components/analytics/PostAnalytics";
import { useTranslations } from "next-intl";

export default function PostAnalyticsPage() {
  const t = useTranslations("analytics");
  const { postId } = useParams<{ postId: string }>();
  const { user } = useUser();
  const userId = user?.id;
  const id = postId as Id<"posts">;
  // getPost only ever returns a post in the caller's own workspace, so
  // this doubles as the same access check the main post detail page uses.
  const post = useQuery(api.posts.getPost, { postId: id });

  if (!userId || post === undefined) return <div>{t("loadingUser")}</div>;
  if (!post) return <div>{t("notFound")}</div>;

  return (
    <div className="mx-auto max-w-5xl p-6 sm:p-8">
      <PostAnalytics postId={id} userId={userId} isOwnPost={post.userId === userId} />
    </div>
  );
}
