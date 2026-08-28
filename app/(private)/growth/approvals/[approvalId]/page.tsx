import { notFound } from "next/navigation";
import ApprovalReview from "@/components/growth/ApprovalReview";
import { approvalPosts, getApprovalPost } from "@/lib/workflow-data";

export function generateStaticParams() {
  return approvalPosts.map((post) => ({ approvalId: post.id }));
}

export default async function GrowthApprovalPage({
  params,
}: {
  params: Promise<{ approvalId: string }>;
}) {
  const { approvalId } = await params;
  const post = getApprovalPost(approvalId);
  if (!post) notFound();
  return <ApprovalReview post={post} />;
}
