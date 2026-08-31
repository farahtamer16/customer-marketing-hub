"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "convex/react";
import {
  ArrowUpRight,
  CheckCircle2,
  Clock3,
  FilePenLine,
  ListChecks,
} from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import type { ColumnDef } from "@tanstack/react-table";
import PageHeader from "@/components/hub/PageHeader";
import DataTable, { dataTableFeatures } from "@/components/ui/DataTable";
import TableToolbar from "@/components/ui/TableToolbar";
import { api } from "@/convex/_generated/api";
import type { ApprovalPost, ApprovalStatus } from "@/types/workflow";
import { DemoModeBanner, MetricCard } from "./GrowthPrimitives";
import { ApprovalStatusPill, ChannelPills } from "./WorkflowPrimitives";

const EMPTY_POSTS: ApprovalPost[] = [];

const statuses: ApprovalStatus[] = [
  "draft",
  "pending",
  "changesRequested",
  "approved",
  "scheduled",
  "published",
  "rejected",
];

export default function ApprovalQueue() {
  const t = useTranslations("growth");
  const format = useFormatter();
  const router = useRouter();
  const approvalPosts = (useQuery(api.approvals.listPosts) ??
    EMPTY_POSTS) as ApprovalPost[];
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [channel, setChannel] = useState("");
  const rows = useMemo(
    () =>
      approvalPosts.filter((post) => {
        const query = search.toLocaleLowerCase();
        return (
          (!query ||
            `${post.campaign} ${post.author} ${post.content}`
              .toLocaleLowerCase()
              .includes(query)) &&
          (!status || post.status === status) &&
          (!channel ||
            post.channels.includes(channel as "facebook" | "instagram"))
        );
      }),
    [approvalPosts, channel, search, status],
  );
  const columns = useMemo<ColumnDef<typeof dataTableFeatures, ApprovalPost>[]>(
    () => [
      {
        id: "post",
        header: t("approvals.post"),
        accessorFn: (row) => row.campaign,
        cell: ({ row }) => (
          <div className="max-w-sm">
            <p className="text-sm font-semibold text-[#071e55]">
              {row.original.campaign}
            </p>
            <p className="mt-1 truncate text-xs text-slate-400">
              {row.original.content}
            </p>
          </div>
        ),
      },
      {
        id: "author",
        header: t("approvals.author"),
        accessorFn: (row) => row.author,
        cell: ({ row }) => (
          <span className="text-xs font-semibold text-slate-600">
            {row.original.author}
          </span>
        ),
      },
      {
        id: "channels",
        header: t("approvals.channel"),
        enableSorting: false,
        cell: ({ row }) => <ChannelPills channels={row.original.channels} />,
      },
      {
        id: "status",
        header: t("approvals.status"),
        accessorFn: (row) => row.status,
        cell: ({ row }) => <ApprovalStatusPill status={row.original.status} />,
      },
      {
        id: "submitted",
        header: t("approvals.submitted"),
        accessorFn: (row) => row.submittedAt,
        cell: ({ row }) => (
          <span className="text-xs text-slate-500">
            {format.dateTime(row.original.submittedAt, {
              dateStyle: "medium",
              timeStyle: "short",
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
  const pending = approvalPosts.filter(
    (post) => post.status === "pending",
  ).length;
  const changes = approvalPosts.filter(
    (post) => post.status === "changesRequested",
  ).length;
  const approved = approvalPosts.filter(
    (post) => post.status === "approved",
  ).length;

  return (
    <>
      <PageHeader
        eyebrow={t("approvals.eyebrow")}
        title={t("approvals.title")}
        description={t("approvals.description")}
      />
      <DemoModeBanner />
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          icon={ListChecks}
          label={t("approvals.total")}
          value={String(approvalPosts.length)}
        />
        <MetricCard
          icon={Clock3}
          label={t("approvals.pending")}
          value={String(pending)}
          tone="bg-amber-50 text-amber-700"
        />
        <MetricCard
          icon={FilePenLine}
          label={t("approvals.changes")}
          value={String(changes)}
          tone="bg-rose-50 text-rose-700"
        />
        <MetricCard
          icon={CheckCircle2}
          label={t("approvals.approved")}
          value={String(approved)}
          tone="bg-emerald-50 text-emerald-700"
        />
      </section>
      <section className="glass-card mt-6 overflow-hidden rounded-3xl">
        <TableToolbar
          title={t("approvals.tableTitle")}
          countLabel={t("approvals.results", {
            count: rows.length,
            total: approvalPosts.length,
          })}
          search={search}
          searchPlaceholder={t("approvals.search")}
          clearLabel={t("approvals.clear")}
          onSearchChange={setSearch}
          onClear={() => {
            setSearch("");
            setStatus("");
            setChannel("");
          }}
          filters={[
            {
              label: t("approvals.status"),
              value: status,
              allLabel: t("approvals.allStatuses"),
              options: statuses.map((value) => ({
                value,
                label: t(`approvalStatuses.${value}`),
              })),
              onChange: setStatus,
            },
            {
              label: t("approvals.channel"),
              value: channel,
              allLabel: t("approvals.allChannels"),
              options: (["facebook", "instagram"] as const).map((value) => ({
                value,
                label: t(`approvals.channels.${value}`),
              })),
              onChange: setChannel,
            },
          ]}
        />
        <DataTable
          columns={columns}
          data={rows}
          emptyMessage={t("approvals.empty")}
          getRowId={(post) => post.id}
          onRowClick={(post) => router.push(`/growth/approvals/${post.id}`)}
          getRowLabel={(post) =>
            t("approvals.open", { campaign: post.campaign })
          }
          initialSorting={[{ id: "submitted", desc: true }]}
        />
      </section>
    </>
  );
}
