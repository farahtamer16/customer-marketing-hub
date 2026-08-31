"use client";

import { use } from "react";
import { useQuery } from "convex/react";
import { notFound } from "next/navigation";
import AccountProfile from "@/components/growth/AccountProfile";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import type { GrowthAccount } from "@/types/growth";

export default function GrowthAccountPage({
  params,
}: {
  params: Promise<{ accountId: string }>;
}) {
  const { accountId } = use(params);
  const account = useQuery(api.growth.getAccount, {
    accountId: accountId as Id<"growthAccounts">,
  });

  if (account === null) notFound();
  if (account === undefined) return null;

  return <AccountProfile account={account as GrowthAccount} />;
}
