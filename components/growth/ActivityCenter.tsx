"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, BellRing, CheckCheck, History } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import type { ColumnDef } from "@tanstack/react-table";
import PageHeader from "@/components/hub/PageHeader";
import DataTable, { dataTableFeatures } from "@/components/ui/DataTable";
import { workspaceAudit, workspaceNotifications } from "@/lib/workflow-data";
import type { WorkspaceAuditEntry } from "@/types/workflow";
import { DemoModeBanner } from "./GrowthPrimitives";
import { NotificationIcon, UnreadDot } from "./WorkflowPrimitives";

export default function ActivityCenter() {
  const t = useTranslations("growth");
  const format = useFormatter();
  const [notifications, setNotifications] = useState(workspaceNotifications);
  const columns = useMemo<
    ColumnDef<typeof dataTableFeatures, WorkspaceAuditEntry>[]
  >(
    () => [
      {
        id: "actor",
        header: t("activity.actor"),
        accessorFn: (row) => row.actor,
        cell: ({ row }) => (
          <span className="text-sm font-semibold text-[#071e55]">
            {row.original.actor}
          </span>
        ),
      },
      {
        id: "action",
        header: t("activity.action"),
        accessorFn: (row) => row.action,
        cell: ({ row }) => (
          <span className="text-xs font-semibold text-slate-600">
            {t(`auditActions.${row.original.action}`)}
          </span>
        ),
      },
      {
        id: "target",
        header: t("activity.target"),
        accessorFn: (row) => row.target,
        cell: ({ row }) => (
          <span className="text-xs text-slate-500">{row.original.target}</span>
        ),
      },
      {
        id: "time",
        header: t("activity.time"),
        accessorFn: (row) => row.occurredAt,
        cell: ({ row }) => (
          <span className="text-xs text-slate-400">
            {format.dateTime(row.original.occurredAt, {
              dateStyle: "medium",
              timeStyle: "short",
            })}
          </span>
        ),
      },
    ],
    [format, t],
  );
  const unread = notifications.filter((item) => !item.read).length;

  return (
    <>
      <PageHeader
        eyebrow={t("activity.eyebrow")}
        title={t("activity.title")}
        description={t("activity.description")}
        action={
          <button
            type="button"
            onClick={() =>
              setNotifications((current) =>
                current.map((item) => ({ ...item, read: true })),
              )
            }
            disabled={!unread}
            className="inline-flex items-center gap-2 rounded-xl border border-blue-200 bg-white px-4 py-2.5 text-sm font-semibold text-[#173b9a] disabled:opacity-40"
          >
            <CheckCheck size={16} /> {t("activity.markAllRead")}
          </button>
        }
      />
      <DemoModeBanner />
      <section className="grid gap-6 xl:grid-cols-[0.8fr_1.2fr]">
        <article className="glass-card rounded-3xl p-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[0.65rem] font-bold uppercase tracking-[0.16em] text-[#3156dc]">
                {t("activity.notifications")}
              </p>
              <h2 className="mt-2 text-xl font-semibold text-[#071e55]">
                {t("activity.inbox", { count: unread })}
              </h2>
            </div>
            <BellRing size={20} className="text-[#3156dc]" />
          </div>
          <div className="mt-5 space-y-3">
            {notifications.map((item) => (
              <Link
                key={item.id}
                href={item.href}
                onClick={() =>
                  setNotifications((current) =>
                    current.map((notification) =>
                      notification.id === item.id
                        ? { ...notification, read: true }
                        : notification,
                    ),
                  )
                }
                className={`flex items-start gap-3 rounded-2xl border p-4 transition hover:border-blue-200 ${item.read ? "border-slate-100 bg-white/60" : "border-blue-200 bg-blue-50/55"}`}
              >
                <NotificationIcon />
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-[#071e55]">
                      {t(`notificationData.${item.id}.title`)}
                    </span>
                    {!item.read && <UnreadDot />}
                  </span>
                  <span className="mt-1 block text-xs leading-5 text-slate-500">
                    {t(`notificationData.${item.id}.detail`)}
                  </span>
                  <span className="mt-2 block text-[0.68rem] text-slate-400">
                    {format.dateTime(item.occurredAt, {
                      dateStyle: "medium",
                      timeStyle: "short",
                    })}
                  </span>
                </span>
                <ArrowUpRight size={14} className="text-slate-300" />
              </Link>
            ))}
          </div>
        </article>
        <article className="glass-card overflow-hidden rounded-3xl">
          <div className="flex items-center gap-3 border-b border-slate-100 px-6 py-5">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-violet-50 text-violet-700">
              <History size={18} />
            </span>
            <div>
              <h2 className="font-semibold text-[#071e55]">
                {t("activity.auditTitle")}
              </h2>
              <p className="mt-1 text-xs text-slate-500">
                {t("activity.auditHint")}
              </p>
            </div>
          </div>
          <DataTable
            columns={columns}
            data={workspaceAudit}
            emptyMessage={t("activity.empty")}
            getRowId={(entry) => entry.id}
            initialSorting={[{ id: "time", desc: true }]}
            pageSize={6}
          />
        </article>
      </section>
    </>
  );
}
