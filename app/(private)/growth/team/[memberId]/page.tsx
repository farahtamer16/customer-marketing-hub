"use client";

import { use } from "react";
import MemberActivity from "@/components/growth/MemberActivity";
import type { Id } from "@/convex/_generated/dataModel";

export default function MemberActivityPage({
  params,
}: {
  params: Promise<{ memberId: string }>;
}) {
  const { memberId } = use(params);
  return <MemberActivity memberId={memberId as Id<"teamMembers">} />;
}
