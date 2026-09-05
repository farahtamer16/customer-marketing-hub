"use client";

import { use } from "react";
import { notFound } from "next/navigation";
import TeamContentStudio, {
  type StudioTab,
} from "@/components/growth/TeamContentStudio";
import type { Id } from "@/convex/_generated/dataModel";

const VALID_TABS: StudioTab[] = ["posts", "calendar", "comments", "analytics"];

export default function ContentStudioPage({
  params,
}: {
  params: Promise<{ teamId: string; tab: string }>;
}) {
  const { teamId, tab } = use(params);
  if (!VALID_TABS.includes(tab as StudioTab)) notFound();

  return <TeamContentStudio teamId={teamId as Id<"teams">} tab={tab as StudioTab} />;
}
