"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "convex/react";
import { ArrowUpRight, Plus } from "lucide-react";
import { useTranslations } from "next-intl";
import type { ColumnDef } from "@tanstack/react-table";
import PageHeader from "@/components/hub/PageHeader";
import DataTable, { dataTableFeatures } from "@/components/ui/DataTable";
import TableToolbar from "@/components/ui/TableToolbar";
import { api } from "@/convex/_generated/api";
import { signalSources } from "@/lib/growth-data";
import type { GrowthAccount, GrowthLead } from "@/types/growth";
import {
  AccountAvatar,
  DemoModeBanner,
  ScoreMeter,
  SourcePill,
} from "./GrowthPrimitives";
import NewLeadDialog from "./NewLeadDialog";

const EMPTY_ACCOUNTS: GrowthAccount[] = [];
const EMPTY_LEADS: GrowthLead[] = [];

export default function LeadDirectory() {
  const t = useTranslations("growth");
  const router = useRouter();
  const growthAccounts = (useQuery(api.growth.listAccounts) ??
    EMPTY_ACCOUNTS) as GrowthAccount[];
  const growthLeads = (useQuery(api.growth.listLeads) ??
    EMPTY_LEADS) as GrowthLead[];
  const [search, setSearch] = useState("");
  const [intent, setIntent] = useState("");
  const [source, setSource] = useState("");
  const [newLeadOpen, setNewLeadOpen] = useState(false);
  const rows = useMemo(
    () =>
      growthLeads.filter((lead) => {
        const account = growthAccounts.find(
          (item) => item.id === lead.accountId,
        );
        const query = search.toLocaleLowerCase();
        return (
          (!query ||
            `${lead.name} ${lead.title} ${account?.name ?? ""}`
              .toLocaleLowerCase()
              .includes(query)) &&
          (!intent || lead.intent === intent) &&
          (!source || lead.source === source)
        );
      }),
    [growthAccounts, growthLeads, intent, search, source],
  );

  const columns = useMemo<ColumnDef<typeof dataTableFeatures, GrowthLead>[]>(
    () => [
      {
        id: "lead",
        header: t("leads.person"),
        accessorFn: (row) => row.name,
        cell: ({ row }) => (
          <div className="flex items-center gap-3">
            <AccountAvatar name={row.original.name} />
            <div>
              <p className="text-sm font-semibold text-[#071e55]">
                {row.original.name}
              </p>
              <p className="mt-0.5 text-xs text-slate-400">
                {row.original.title}
              </p>
            </div>
          </div>
        ),
      },
      {
        id: "account",
        header: t("leads.account"),
        accessorFn: (row) => row.accountId,
        cell: ({ row }) => (
          <span className="text-sm font-medium text-slate-700">
            {growthAccounts.find(
              (account) => account.id === row.original.accountId,
            )?.name ?? row.original.accountId}
          </span>
        ),
      },
      {
        id: "role",
        header: t("leads.role"),
        accessorFn: (row) => row.role,
        cell: ({ row }) => (
          <span className="rounded-full bg-blue-50 px-2.5 py-1 text-[0.68rem] font-bold text-blue-700">
            {t(`roles.${row.original.role}`)}
          </span>
        ),
      },
      {
        id: "score",
        header: t("leads.leadScore"),
        accessorFn: (row) => row.score,
        cell: ({ row }) => (
          <ScoreMeter
            compact
            label={t("leads.leadScore")}
            value={row.original.score}
          />
        ),
      },
      {
        id: "intent",
        header: t("leads.buyLikelihood"),
        accessorFn: (row) => row.intent,
        cell: ({ row }) => (
          <span
            className={`rounded-full px-2.5 py-1 text-[0.68rem] font-bold ${row.original.intent === "high" ? "bg-emerald-50 text-emerald-700" : row.original.intent === "medium" ? "bg-amber-50 text-amber-700" : "bg-slate-100 text-slate-600"}`}
          >
            {t(`intent.${row.original.intent}`)}
          </span>
        ),
      },
      {
        id: "source",
        header: t("leads.latestSource"),
        accessorFn: (row) => row.source,
        cell: ({ row }) => <SourcePill source={row.original.source} />,
      },
      {
        id: "action",
        header: t("leads.nextAction"),
        accessorFn: (row) => row.nextAction,
        cell: ({ row }) => (
          <span className="block max-w-44 text-xs font-medium leading-5 text-slate-600">
            {t(`actions.${row.original.nextAction}`)}
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
    [growthAccounts, t],
  );

  return (
    <>
      <PageHeader
        eyebrow={t("leads.eyebrow")}
        title={t("leads.title")}
        description={t("leads.description")}
        action={
          <button
            type="button"
            onClick={() => setNewLeadOpen(true)}
            className="inline-flex items-center gap-2 rounded-xl bg-[#173b9a] px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-900/15"
          >
            <Plus size={16} /> {t("leads.newLead")}
          </button>
        }
      />
      <DemoModeBanner />
      <section className="glass-card overflow-hidden rounded-3xl">
        <TableToolbar
          title={t("leads.tableTitle")}
          countLabel={t("leads.results", {
            count: rows.length,
            total: growthLeads.length,
          })}
          search={search}
          searchPlaceholder={t("leads.search")}
          clearLabel={t("leads.clear")}
          onSearchChange={setSearch}
          onClear={() => {
            setSearch("");
            setIntent("");
            setSource("");
          }}
          filters={[
            {
              label: t("leads.buyLikelihood"),
              value: intent,
              allLabel: t("leads.allIntent"),
              options: (["high", "medium", "low"] as const).map((value) => ({
                value,
                label: t(`intent.${value}`),
              })),
              onChange: setIntent,
            },
            {
              label: t("leads.latestSource"),
              value: source,
              allLabel: t("leads.allSources"),
              options: signalSources.map((value) => ({
                value,
                label: t(`sources.${value}`),
              })),
              onChange: setSource,
            },
          ]}
        />
        <DataTable
          columns={columns}
          data={rows}
          emptyMessage={t("leads.empty")}
          getRowId={(row) => row.id}
          onRowClick={(row) => router.push(`/growth/accounts/${row.accountId}`)}
          getRowLabel={(row) => t("leads.open", { name: row.name })}
          initialSorting={[{ id: "score", desc: true }]}
          pageSize={10}
        />
      </section>
      <NewLeadDialog open={newLeadOpen} onClose={() => setNewLeadOpen(false)} />
    </>
  );
}
