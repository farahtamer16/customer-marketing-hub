"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { ShieldCheck, UserCheck, UserPlus, UsersRound, UserX } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import type { ColumnDef } from "@tanstack/react-table";
import { toast } from "sonner";
import PageHeader from "@/components/hub/PageHeader";
import DataTable, { dataTableFeatures } from "@/components/ui/DataTable";
import TableToolbar from "@/components/ui/TableToolbar";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { workspacePermissions, workspaceRoles } from "@/lib/workspace-data";
import type { WorkspaceMember, WorkspaceRole } from "@/types/growth";
import { DemoModeBanner, MetricCard } from "./GrowthPrimitives";
import InviteMemberDialog from "./InviteMemberDialog";
import { MemberAvatar, MemberStatusPill, WorkspaceRolePill } from "./TeamPrimitives";

const EMPTY_MEMBERS: WorkspaceMember[] = [];

export default function TeamAccessWorkspace() {
  const t = useTranslations("growth");
  const format = useFormatter();
  const members = (useQuery(api.team.listMembers) ??
    EMPTY_MEMBERS) as WorkspaceMember[];
  const updateMemberRole = useMutation(api.team.updateMemberRole);
  const removeMember = useMutation(api.team.removeMember);
  const [search, setSearch] = useState("");
  const [role, setRole] = useState("");
  const [status, setStatus] = useState("");
  const [inviteOpen, setInviteOpen] = useState(false);
  const rows = useMemo(
    () =>
      members.filter((member) => {
        const query = search.toLocaleLowerCase();
        return (
          (!query ||
            `${member.name} ${member.email}`
              .toLocaleLowerCase()
              .includes(query)) &&
          (!role || member.role === role) &&
          (!status || member.status === status)
        );
      }),
    [members, role, search, status],
  );
  const columns = useMemo<
    ColumnDef<typeof dataTableFeatures, WorkspaceMember>[]
  >(
    () => [
      {
        id: "member",
        header: t("team.member"),
        accessorFn: (row) => row.name,
        cell: ({ row }) => (
          <div className="flex items-center gap-3">
            <MemberAvatar name={row.original.name} />
            <div>
              <p className="text-sm font-semibold text-[#071e55]">
                {row.original.name}
              </p>
              <p className="mt-0.5 text-xs text-slate-400">
                {row.original.email}
              </p>
            </div>
          </div>
        ),
      },
      {
        id: "role",
        header: t("team.role"),
        accessorFn: (row) => row.role,
        cell: ({ row }) => (
          <select
            value={row.original.role}
            onClick={(event) => event.stopPropagation()}
            onChange={async (event) => {
              try {
                await updateMemberRole({
                  memberId: row.original.id as Id<"teamMembers">,
                  role: event.target.value as WorkspaceRole,
                });
              } catch (error) {
                toast.error(
                  error instanceof Error ? error.message : t("team.updateRoleFailed"),
                );
              }
            }}
            className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[0.68rem] font-bold text-slate-700 outline-none focus:border-blue-400"
          >
            {workspaceRoles.map((definition) => (
              <option key={definition.role} value={definition.role}>
                {t(`workspaceRoles.${definition.role}`)}
              </option>
            ))}
          </select>
        ),
      },
      {
        id: "status",
        header: t("team.status"),
        accessorFn: (row) => row.status,
        cell: ({ row }) => <MemberStatusPill status={row.original.status} />,
      },
      {
        id: "lastActive",
        header: t("team.lastActive"),
        accessorFn: (row) => row.lastActive ?? 0,
        cell: ({ row }) => (
          <span className="text-xs text-slate-500">
            {row.original.lastActive
              ? format.dateTime(row.original.lastActive, {
                  dateStyle: "medium",
                  timeStyle: "short",
                })
              : t("team.awaitingAcceptance")}
          </span>
        ),
      },
      {
        id: "actions",
        header: "",
        enableSorting: false,
        cell: ({ row }) => (
          <button
            type="button"
            onClick={async (event) => {
              event.stopPropagation();
              if (!window.confirm(t("team.removeConfirm", { name: row.original.name })))
                return;
              try {
                await removeMember({ memberId: row.original.id as Id<"teamMembers"> });
              } catch (error) {
                toast.error(
                  error instanceof Error ? error.message : t("team.removeFailed"),
                );
              }
            }}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
            aria-label={t("team.remove", { name: row.original.name })}
          >
            <UserX size={15} />
          </button>
        ),
      },
    ],
    [format, removeMember, t, updateMemberRole],
  );
  const active = members.filter((member) => member.status === "active").length;
  const invited = members.filter(
    (member) => member.status === "invited",
  ).length;

  return (
    <>
      <PageHeader
        eyebrow={t("team.eyebrow")}
        title={t("team.title")}
        description={t("team.description")}
        action={
          <button
            type="button"
            onClick={() => setInviteOpen(true)}
            className="inline-flex items-center gap-2 rounded-xl bg-[#173b9a] px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-900/15"
          >
            <UserPlus size={16} /> {t("team.invite")}
          </button>
        }
      />
      <DemoModeBanner />

      <section className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          icon={UsersRound}
          label={t("team.totalMembers")}
          value={String(members.length)}
        />
        <MetricCard
          icon={UserCheck}
          label={t("team.activeMembers")}
          value={String(active)}
          tone="bg-emerald-50 text-emerald-700"
        />
        <MetricCard
          icon={UserPlus}
          label={t("team.pendingInvites")}
          value={String(invited)}
          tone="bg-sky-50 text-sky-700"
        />
        <MetricCard
          icon={ShieldCheck}
          label={t("team.workspaceRoles")}
          value={String(workspaceRoles.length)}
          tone="bg-violet-50 text-violet-700"
        />
      </section>

      <section className="glass-card mt-6 overflow-hidden rounded-3xl">
        <TableToolbar
          title={t("team.tableTitle")}
          countLabel={t("team.results", {
            count: rows.length,
            total: members.length,
          })}
          search={search}
          searchPlaceholder={t("team.search")}
          clearLabel={t("team.clear")}
          onSearchChange={setSearch}
          onClear={() => {
            setSearch("");
            setRole("");
            setStatus("");
          }}
          filters={[
            {
              label: t("team.role"),
              value: role,
              allLabel: t("team.allRoles"),
              options: workspaceRoles.map((definition) => ({
                value: definition.role,
                label: t(`workspaceRoles.${definition.role}`),
              })),
              onChange: setRole,
            },
            {
              label: t("team.status"),
              value: status,
              allLabel: t("team.allStatuses"),
              options: (["active", "invited", "suspended"] as const).map(
                (value) => ({
                  value,
                  label: t(`team.statuses.${value}`),
                }),
              ),
              onChange: setStatus,
            },
          ]}
        />
        <DataTable
          columns={columns}
          data={rows}
          emptyMessage={t("team.empty")}
          getRowId={(member) => member.id}
          initialSorting={[{ id: "member", desc: false }]}
        />
      </section>

      <section className="glass-card mt-6 overflow-hidden rounded-3xl">
        <div className="border-b border-slate-100 px-6 py-5">
          <h2 className="font-semibold text-[#071e55]">
            {t("team.permissionMatrix")}
          </h2>
          <p className="mt-1 text-xs text-slate-500">
            {t("team.permissionMatrixHint")}
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] border-collapse text-start">
            <thead className="border-b border-slate-100 text-[0.62rem] font-bold uppercase tracking-[0.12em] text-slate-400">
              <tr>
                <th className="px-6 py-4">{t("team.role")}</th>
                {workspacePermissions.map((permission) => (
                  <th key={permission} className="px-3 py-4 text-center">
                    {t(`permissions.${permission}`)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {workspaceRoles.map((definition) => (
                <tr key={definition.role}>
                  <td className="px-6 py-4">
                    <WorkspaceRolePill role={definition.role} />
                  </td>
                  {workspacePermissions.map((permission) => (
                    <td key={permission} className="px-3 py-4 text-center">
                      <span
                        className={`mx-auto grid h-7 w-7 place-items-center rounded-full text-xs font-bold ${definition.permissions.includes(permission) ? "bg-emerald-50 text-emerald-700" : "bg-slate-50 text-slate-300"}`}
                        aria-label={
                          definition.permissions.includes(permission)
                            ? t("team.allowed")
                            : t("team.notAllowed")
                        }
                      >
                        {definition.permissions.includes(permission)
                          ? "✓"
                          : "—"}
                      </span>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <InviteMemberDialog open={inviteOpen} onClose={() => setInviteOpen(false)} />
    </>
  );
}
