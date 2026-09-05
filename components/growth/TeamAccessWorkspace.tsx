"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { useRouter } from "next/navigation";
import {
  Activity,
  ClipboardList,
  Plus,
  ShieldCheck,
  UserCheck,
  UserPlus,
  UsersRound,
  UserX,
} from "lucide-react";
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
import CreateMemberDialog from "./CreateMemberDialog";
import { DemoModeBanner, MetricCard } from "./GrowthPrimitives";
import { MemberAvatar, MemberStatusPill, WorkspaceRolePill } from "./TeamPrimitives";
import TeamTasksDialog from "./TeamTasksDialog";

const EMPTY_MEMBERS: WorkspaceMember[] = [];
const EMPTY_TEAMS: { id: string; name: string; createdAt: number; memberCount: number }[] = [];
const UNGROUPED = "__ungrouped__";

export default function TeamAccessWorkspace() {
  const t = useTranslations("growth");
  const format = useFormatter();
  const router = useRouter();
  // Every member across every team, so filtering by team is just another
  // client-side facet alongside role/status — "follow them at the same
  // time or by category" without a second round trip per team.
  const members = (useQuery(api.teams.listMembersByTeam, {}) ??
    EMPTY_MEMBERS) as WorkspaceMember[];
  const teams = useQuery(api.teams.listTeams) ?? EMPTY_TEAMS;
  const updateMemberRole = useMutation(api.team.updateMemberRole);
  const removeMember = useMutation(api.team.removeMember);
  const assignMemberToTeam = useMutation(api.teams.assignMemberToTeam);
  const createTeam = useMutation(api.teams.createTeam);
  const deleteTeam = useMutation(api.teams.deleteTeam);
  const [search, setSearch] = useState("");
  const [role, setRole] = useState("");
  const [status, setStatus] = useState("");
  const [teamFilter, setTeamFilter] = useState("");
  const [inviteOpen, setInviteOpen] = useState(false);
  const [newTeamName, setNewTeamName] = useState("");
  const [creatingTeam, setCreatingTeam] = useState(false);
  const [tasksTeam, setTasksTeam] = useState<{ id: Id<"teams">; name: string } | null>(null);
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
          (!status || member.status === status) &&
          (!teamFilter ||
            (teamFilter === UNGROUPED ? !member.teamId : member.teamId === teamFilter))
        );
      }),
    [members, role, search, status, teamFilter],
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
        id: "team",
        header: t("team.team"),
        accessorFn: (row) => row.teamId ?? "",
        cell: ({ row }) => (
          <select
            value={row.original.teamId ?? ""}
            onClick={(event) => event.stopPropagation()}
            onChange={async (event) => {
              try {
                await assignMemberToTeam({
                  memberId: row.original.id as Id<"teamMembers">,
                  teamId: event.target.value
                    ? (event.target.value as Id<"teams">)
                    : undefined,
                });
              } catch (error) {
                toast.error(
                  error instanceof Error ? error.message : t("team.assignTeamFailed"),
                );
              }
            }}
            className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[0.68rem] font-bold text-slate-700 outline-none focus:border-blue-400"
          >
            <option value="">{t("team.noTeam")}</option>
            {teams.map((team) => (
              <option key={team.id} value={team.id}>
                {team.name}
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
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                router.push(`/growth/team/${row.original.id}`);
              }}
              className="rounded-lg p-1.5 text-slate-400 hover:bg-blue-50 hover:text-[#173b9a]"
              aria-label={t("team.viewActivity", { name: row.original.name })}
              title={t("team.viewActivity", { name: row.original.name })}
            >
              <Activity size={15} />
            </button>
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
          </div>
        ),
      },
    ],
    [assignMemberToTeam, format, removeMember, router, t, teams, updateMemberRole],
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

      <section className="glass-card mt-6 rounded-3xl p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-semibold text-[#071e55]">{t("team.teamsTitle")}</h2>
            <p className="mt-1 text-xs text-slate-500">{t("team.teamsHint")}</p>
          </div>
          <form
            className="flex items-center gap-2"
            onSubmit={async (event) => {
              event.preventDefault();
              const name = newTeamName.trim();
              if (!name || creatingTeam) return;
              setCreatingTeam(true);
              try {
                await createTeam({ name });
                setNewTeamName("");
              } catch (error) {
                toast.error(error instanceof Error ? error.message : t("team.createTeamFailed"));
              } finally {
                setCreatingTeam(false);
              }
            }}
          >
            <input
              value={newTeamName}
              onChange={(event) => setNewTeamName(event.target.value)}
              placeholder={t("team.newTeamPlaceholder")}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
            />
            <button
              type="submit"
              disabled={!newTeamName.trim() || creatingTeam}
              className="inline-flex items-center gap-1.5 rounded-xl bg-[#173b9a] px-3 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Plus size={15} /> {t("team.createTeam")}
            </button>
          </form>
        </div>
        {teams.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {teams.map((team) => (
              <div
                key={team.id}
                className="flex items-center gap-2 rounded-full border border-slate-200 bg-white/70 px-3 py-1.5 text-xs font-semibold text-slate-600"
              >
                <span>{team.name}</span>
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[0.62rem] text-slate-500">
                  {team.memberCount}
                </span>
                <button
                  type="button"
                  onClick={() => setTasksTeam({ id: team.id as Id<"teams">, name: team.name })}
                  className="text-slate-400 hover:text-[#173b9a]"
                  aria-label={t("team.manageTasks", { name: team.name })}
                  title={t("team.manageTasks", { name: team.name })}
                >
                  <ClipboardList size={13} />
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    if (!window.confirm(t("team.deleteTeamConfirm", { name: team.name }))) return;
                    try {
                      await deleteTeam({ teamId: team.id as Id<"teams"> });
                      if (teamFilter === team.id) setTeamFilter("");
                    } catch (error) {
                      toast.error(
                        error instanceof Error ? error.message : t("team.deleteTeamFailed"),
                      );
                    }
                  }}
                  className="text-slate-400 hover:text-rose-600"
                  aria-label={t("team.deleteTeam", { name: team.name })}
                >
                  <UserX size={13} />
                </button>
              </div>
            ))}
          </div>
        )}
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
            setTeamFilter("");
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
            {
              label: t("team.team"),
              value: teamFilter,
              allLabel: t("team.allTeams"),
              options: [
                ...teams.map((team) => ({ value: team.id, label: team.name })),
                { value: UNGROUPED, label: t("team.noTeam") },
              ],
              onChange: setTeamFilter,
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

      <CreateMemberDialog open={inviteOpen} onClose={() => setInviteOpen(false)} />
      <TeamTasksDialog
        teamId={tasksTeam?.id ?? null}
        teamName={tasksTeam?.name ?? ""}
        open={tasksTeam !== null}
        onClose={() => setTasksTeam(null)}
      />
    </>
  );
}
