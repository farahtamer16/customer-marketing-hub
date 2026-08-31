"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useQuery } from "convex/react";
import { ArrowUpRight, Megaphone, Sparkles, UserCheck } from "lucide-react";
import { useTranslations } from "next-intl";
import type { ColumnDef } from "@tanstack/react-table";
import DataTable, { dataTableFeatures } from "@/components/ui/DataTable";
import TableToolbar from "@/components/ui/TableToolbar";
import { api } from "@/convex/_generated/api";
import { journeyStages } from "@/lib/growth-data";
import type { CampaignImpact, GrowthAccount, GrowthLead } from "@/types/growth";
import { DashboardCard, RoleDashboardShell } from "./DashboardPrimitives";
import { ScoreMeter, StagePill } from "./GrowthPrimitives";

const EMPTY_ACCOUNTS: GrowthAccount[] = [];
const EMPTY_LEADS: GrowthLead[] = [];
const EMPTY_CAMPAIGNS: CampaignImpact[] = [];

export default function MarketingManagerDashboard() {
  const t = useTranslations("growth.roleDashboards.marketing_manager");
  const growth = useTranslations("growth");
  const growthAccounts = (useQuery(api.growth.listAccounts) ??
    EMPTY_ACCOUNTS) as GrowthAccount[];
  const growthLeads = (useQuery(api.growth.listLeads) ??
    EMPTY_LEADS) as GrowthLead[];
  const campaignImpact = (useQuery(api.campaigns.listCampaigns) ??
    EMPTY_CAMPAIGNS) as CampaignImpact[];
  const [search, setSearch] = useState("");
  const [stage, setStage] = useState("");
  const accounts = useMemo(
    () =>
      growthAccounts.filter(
        (account) =>
          (!search ||
            `${account.name} ${account.industry}`
              .toLocaleLowerCase()
              .includes(search.toLocaleLowerCase())) &&
          (!stage || account.stage === stage),
      ),
    [growthAccounts, search, stage],
  );
  const columns = useMemo<ColumnDef<typeof dataTableFeatures, GrowthAccount>[]>(
    () => [
      {
        id: "account",
        header: t("account"),
        enableSorting: false,
        accessorFn: (row) => row.name,
        cell: ({ row }) => (
          <div>
            <p className="text-sm font-semibold text-[#071e55]">
              {row.original.name}
            </p>
            <p className="mt-1 text-xs text-slate-400">
              {row.original.industry}
            </p>
          </div>
        ),
      },
      {
        id: "stage",
        header: t("journeyStage"),
        enableSorting: false,
        accessorFn: (row) => row.stage,
        cell: ({ row }) => <StagePill stage={row.original.stage} />,
      },
      {
        id: "scores",
        header: t("scoreBreakdown"),
        enableSorting: false,
        cell: ({ row }) => (
          <div className="grid min-w-52 gap-2">
            <ScoreMeter
              label={growth("scores.intent")}
              value={row.original.intentScore}
              compact
            />
            <ScoreMeter
              label={growth("scores.engagement")}
              value={row.original.engagementScore}
              compact
            />
          </div>
        ),
      },
      {
        id: "nextAction",
        header: t("nextAction"),
        enableSorting: false,
        accessorFn: (row) => row.nextAction,
        cell: ({ row }) => (
          <span className="text-xs font-semibold text-[#2854dc]">
            {growth(`actions.${row.original.nextAction}`)}
          </span>
        ),
      },
    ],
    [growth, t],
  );
  const priorityLeads = [...growthLeads]
    .sort((a, b) => b.score - a.score)
    .slice(0, 4);

  return (
    <RoleDashboardShell role="marketing_manager">
      <section className="grid gap-4 md:grid-cols-3">
        <DashboardCard
          icon={UserCheck}
          title={t("prioritizeLeads")}
          description={t("prioritizeLeadsDescription")}
          value={String(priorityLeads.length)}
          href="/growth/leads"
        />
        <DashboardCard
          icon={Sparkles}
          title={t("recommendedActions")}
          description={t("recommendedActionsDescription")}
          value={String(accounts.length)}
        />
        <DashboardCard
          icon={Megaphone}
          title={t("nurtureCampaigns")}
          description={t("nurtureCampaignsDescription")}
          value={String(campaignImpact.length)}
          href="/schedule"
        />
      </section>

      <section className="glass-card mt-6 overflow-hidden rounded-3xl">
        <TableToolbar
          title={t("scoredAccounts")}
          countLabel={t("results", {
            count: accounts.length,
            total: growthAccounts.length,
          })}
          search={search}
          searchPlaceholder={t("search")}
          clearLabel={t("clear")}
          onSearchChange={setSearch}
          onClear={() => {
            setSearch("");
            setStage("");
          }}
          filters={[
            {
              label: t("journeyStage"),
              value: stage,
              allLabel: t("allStages"),
              options: journeyStages.map((value) => ({
                value,
                label: growth(`stages.${value}`),
              })),
              onChange: setStage,
            },
          ]}
        />
        <DataTable
          columns={columns}
          data={accounts}
          emptyMessage={t("empty")}
          getRowId={(account) => account.id}
        />
      </section>

      <section className="mt-6 grid gap-6 xl:grid-cols-2">
        <article className="glass-card rounded-3xl p-6">
          <h2 className="font-semibold text-[#071e55]">
            {t("priorityLeadList")}
          </h2>
          <div className="mt-5 space-y-3">
            {priorityLeads.map((lead) => (
              <Link
                key={lead.id}
                href={`/growth/accounts/${lead.accountId}`}
                className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-white/70 p-4"
              >
                <span className="grid h-10 w-10 place-items-center rounded-full bg-emerald-50 text-sm font-bold text-emerald-700">
                  {lead.score}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold text-[#071e55]">
                    {lead.name}
                  </span>
                  <span className="mt-1 block text-xs text-slate-500">
                    {lead.title}
                  </span>
                </span>
                <ArrowUpRight size={15} className="text-slate-300" />
              </Link>
            ))}
          </div>
        </article>

        <article className="glass-card rounded-3xl p-6">
          <h2 className="font-semibold text-[#071e55]">
            {t("activeNurtureCampaigns")}
          </h2>
          <div className="mt-5 space-y-3">
            {campaignImpact.map((campaign) => (
              <div
                key={campaign.id}
                className="rounded-2xl border border-slate-100 bg-white/70 p-4"
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-[#071e55]">
                    {campaign.name}
                  </p>
                  <span className="rounded-full bg-blue-50 px-2.5 py-1 text-[0.65rem] font-bold text-blue-700">
                    {campaign.accounts} {t("accounts")}
                  </span>
                </div>
                <p className="mt-2 text-xs text-slate-500">
                  {t("campaignPipeline", { value: campaign.pipeline })}
                </p>
              </div>
            ))}
          </div>
        </article>
      </section>
    </RoleDashboardShell>
  );
}
