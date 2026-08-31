"use client";

import { use } from "react";
import { useQuery } from "convex/react";
import { notFound } from "next/navigation";
import ApprovalReview from "@/components/growth/ApprovalReview";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import type { ApprovalPost } from "@/types/workflow";

export default function GrowthApprovalPage({
  params,
}: {
  params: Promise<{ approvalId: string }>;
}) {
  const { approvalId } = use(params);
  const post = useQuery(api.approvals.getPost, {
    postId: approvalId as Id<"approvalPosts">,
  });

  if (post === null) notFound();
  if (post === undefined) return null;

  return <ApprovalReview post={post as ApprovalPost} />;
}
