import { notFound } from "next/navigation";
import AccountProfile from "@/components/growth/AccountProfile";
import { getGrowthAccount, growthAccounts } from "@/lib/growth-data";

export function generateStaticParams() {
  return growthAccounts.map((account) => ({ accountId: account.id }));
}

export default async function GrowthAccountPage({
  params,
}: {
  params: Promise<{ accountId: string }>;
}) {
  const { accountId } = await params;
  const account = getGrowthAccount(accountId);
  if (!account) notFound();
  return <AccountProfile account={account} />;
}
