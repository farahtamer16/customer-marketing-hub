"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "convex/react";
import { ArrowUpRight, Plus } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import type { ColumnDef } from "@tanstack/react-table";
import PageHeader from "@/components/hub/PageHeader";
import DataTable, { dataTableFeatures } from "@/components/ui/DataTable";
import TableToolbar from "@/components/ui/TableToolbar";
import { api } from "@/convex/_generated/api";
import { journeyStages } from "@/lib/growth-data";
import type { GrowthAccount } from "@/types/growth";
import {
  AccountAvatar,
  DemoModeBanner,
  ScoreMeter,
  StagePill,
} from "./GrowthPrimitives";
import NewAccountDialog from "./NewAccountDialog";

const EMPTY_ACCOUNTS: GrowthAccount[] = [];

export default function AccountDirectory() {
  const t = useTranslations("growth");
  const format = useFormatter();
  const router = useRouter();
  const growthAccounts = (useQuery(api.growth.listAccounts, {}) ??
    EMPTY_ACCOUNTS) as GrowthAccount[];
  const [search, setSearch] = useState("");
  const [stage, setStage] = useState("");
  const [tier, setTier] = useState("");
  const [newAccountOpen, setNewAccountOpen] = useState(false);
  const rows = useMemo(
    () =>
      growthAccounts.filter((account) => {
        const query = search.toLocaleLowerCase();
        return (
          (!query ||
            `${account.name} ${account.domain} ${account.industry}`
              .toLocaleLowerCase()
              .includes(query)) &&
          (!stage || account.stage === stage) &&
          (!tier || account.tier === tier)
        );
      }),
    [growthAccounts, search, stage, tier],
  );

  const columns = useMemo<ColumnDef<typeof dataTableFeatures, GrowthAccount>[]>(
    () => [
      {
        id: "account",
        header: t("accounts.account"),
        accessorFn: (row) => row.name,
        cell: ({ row }) => (
          <div className="flex items-center gap-3">
            <AccountAvatar name={row.original.name} />
            <div>
              <p className="text-sm font-semibold text-[#071e55]">
                {row.original.name}
              </p>
              <p className="mt-0.5 text-xs text-slate-400">
                {row.original.domain}
              </p>
            </div>
          </div>
        ),
      },
      {
        id: "stage",
        header: t("accounts.stage"),
        accessorFn: (row) => row.stage,
        cell: ({ row }) => <StagePill stage={row.original.stage} />,
      },
      {
        id: "intent",
        header: t("scores.intent"),
        accessorFn: (row) => row.intentScore,
        cell: ({ row }) => (
          <ScoreMeter
            compact
            label={t("scores.intent")}
            value={row.original.intentScore}
          />
        ),
      },
      {
        id: "adoption",
        header: t("scores.adoption"),
        accessorFn: (row) => row.adoptionScore,
        cell: ({ row }) => (
          <ScoreMeter
            compact
            label={t("scores.adoption")}
            value={row.original.adoptionScore}
          />
        ),
      },
      {
        id: "coverage",
        header: t("accounts.coverage"),
        accessorFn: (row) => row.buyingGroupCoverage,
        cell: ({ row }) => (
          <span className="text-sm font-semibold text-slate-700">
            {row.original.buyingGroupCoverage}%
          </span>
        ),
      },
      {
        id: "pipeline",
        header: t("accounts.pipeline"),
        accessorFn: (row) => row.pipelineValue,
        cell: ({ row }) => (
          <span className="text-sm font-semibold text-[#071e55]">
            {format.number(row.original.pipelineValue, {
              style: "currency",
              currency: "USD",
              notation: "compact",
            })}
          </span>
        ),
      },
      {
        id: "open",
        header: "",
        enableSorting: false,
        cell: () => <ArrowUpRight size={15} className="text-slate-300" />,
      },
    ],
    [format, t],
  );

  return (
    <>
      <PageHeader
        eyebrow={t("accounts.eyebrow")}
        title={t("accounts.title")}
        description={t("accounts.description")}
        action={
          <button
            type="button"
            onClick={() => setNewAccountOpen(true)}
            className="inline-flex items-center gap-2 rounded-xl bg-[#173b9a] px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-900/15"
          >
            <Plus size={16} /> {t("accounts.newAccount")}
          </button>
        }
      />
      <DemoModeBanner />
      <section className="glass-card overflow-hidden rounded-3xl">
        <TableToolbar
          title={t("accounts.tableTitle")}
          countLabel={t("accounts.results", {
            count: rows.length,
            total: growthAccounts.length,
          })}
          search={search}
          searchPlaceholder={t("accounts.search")}
          clearLabel={t("accounts.clear")}
          onSearchChange={setSearch}
          onClear={() => {
            setSearch("");
            setStage("");
            setTier("");
          }}
          filters={[
            {
              label: t("accounts.stage"),
              value: stage,
              allLabel: t("accounts.allStages"),
              options: journeyStages.map((value) => ({
                value,
                label: t(`stages.${value}`),
              })),
              onChange: setStage,
            },
            {
              label: t("accounts.tier"),
              value: tier,
              allLabel: t("accounts.allTiers"),
              options: (
                ["enterprise", "midMarket", "smallBusiness"] as const
              ).map((value) => ({
                value,
                label: t(`tiers.${value}`),
              })),
              onChange: setTier,
            },
          ]}
        />
        <DataTable
          columns={columns}
          data={rows}
          emptyMessage={t("accounts.empty")}
          getRowId={(row) => row.id}
          onRowClick={(row) => router.push(`/growth/accounts/${row.id}`)}
          getRowLabel={(row) => t("accounts.open", { name: row.name })}
          initialSorting={[{ id: "intent", desc: true }]}
        />
      </section>
      <NewAccountDialog open={newAccountOpen} onClose={() => setNewAccountOpen(false)} />
    </>
  );
}
