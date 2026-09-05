"use client";

import Link from "next/link";
import { useQuery } from "convex/react";
import { ScrollText, ShieldCheck, UsersRound } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import { api } from "@/convex/_generated/api";
import { workspaceRoles } from "@/lib/workspace-data";
import { DashboardCard, RoleDashboardShell, WorkspaceDirectory } from "./DashboardPrimitives";
import { WorkspaceRolePill } from "./TeamPrimitives";

export default function AdminDashboard() {
  const t = useTranslations("growth.roleDashboards.admin");
  const growth = useTranslations("growth");
  const format = useFormatter();
  const workspaceMembers = useQuery(api.team.listMembers) ?? [];
  const workspaceAudit = useQuery(api.audit.listEntries) ?? [];
  const teamPerformance = useQuery(api.teams.getTeamPerformance);

  return (
    <RoleDashboardShell role="admin">
      <WorkspaceDirectory role="admin" />

      <section className="grid gap-4 md:grid-cols-2">
        <DashboardCard
          icon={UsersRound}
          title={t("manageUsers")}
          description={t("manageUsersDescription")}
          value={String(workspaceMembers.length)}
          href="/growth/team"
        />
        <DashboardCard
          icon={ScrollText}
          title={t("systemLogs")}
          description={t("systemLogsDescription")}
          value={String(workspaceAudit.length)}
          href="/growth/activity"
        />
      </section>

      {teamPerformance && teamPerformance.teams.length > 0 && (
        <section className="glass-card mt-6 rounded-3xl p-6">
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-semibold text-[#071e55]">{t("teamPerformance")}</h2>
            <Link
              href="/growth/team"
              className="text-xs font-semibold text-[#173b9a] hover:underline"
            >
              {t("manageTeams")}
            </Link>
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {teamPerformance.teams.map((team) => (
              <div
                key={team.id}
                className="rounded-2xl border border-slate-100 bg-white/70 p-4"
              >
                <p className="text-sm font-semibold text-[#071e55]">{team.name}</p>
                <p className="mt-1 text-xs text-slate-400">
                  {t("teamMemberCount", { count: team.memberCount })}
                </p>
                <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-slate-500">
                  <span>
                    {t("teamAccounts")}:{" "}
                    <strong className="text-[#071e55]">{team.accountCount}</strong>
                  </span>
                  <span>
                    {t("teamCampaigns")}:{" "}
                    <strong className="text-[#071e55]">{team.campaignCount}</strong>
                  </span>
                  <span>
                    {t("teamPipeline")}:{" "}
                    <strong className="text-[#071e55]">
                      {format.number(team.pipelineValue, {
                        style: "currency",
                        currency: "USD",
                        notation: "compact",
                      })}
                    </strong>
                  </span>
                  <span>
                    {t("teamLtv")}:{" "}
                    <strong className="text-[#071e55]">
                      {format.number(team.ltv, {
                        style: "currency",
                        currency: "USD",
                        notation: "compact",
                      })}
                    </strong>
                  </span>
                </div>
              </div>
            ))}
          </div>
          {teamPerformance.unassigned.accountCount + teamPerformance.unassigned.campaignCount > 0 && (
            <p className="mt-4 text-xs text-slate-400">
              {t("teamUnassigned", {
                accounts: teamPerformance.unassigned.accountCount,
                campaigns: teamPerformance.unassigned.campaignCount,
              })}
            </p>
          )}
        </section>
      )}

      <section className="mt-6 grid gap-6 xl:grid-cols-[1fr_1fr]">
        <article className="glass-card rounded-3xl p-6">
          <div className="flex items-center gap-3">
            <UsersRound size={18} className="text-[#3156dc]" />
            <h2 className="font-semibold text-[#071e55]">
              {t("usersAndRoles")}
            </h2>
          </div>
          <div className="mt-5 space-y-3">
            {workspaceMembers.map((member) => (
              <div
                key={member.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-100 bg-white/70 p-4"
              >
                <div>
                  <p className="text-sm font-semibold text-[#071e55]">
                    {member.name}
                  </p>
                  <p className="mt-1 text-xs text-slate-400">{member.email}</p>
                </div>
                <WorkspaceRolePill role={member.role} />
              </div>
            ))}
          </div>
          <div className="mt-5 flex flex-wrap gap-2 border-t border-slate-100 pt-5">
            {workspaceRoles.map(({ role }) => (
              <WorkspaceRolePill key={role} role={role} />
            ))}
          </div>
        </article>

        <article className="glass-card rounded-3xl p-6">
          <div className="flex items-center gap-3">
            <ShieldCheck size={18} className="text-[#3156dc]" />
            <h2 className="font-semibold text-[#071e55]">{t("recentLogs")}</h2>
          </div>
          <div className="mt-5 space-y-4">
            {workspaceAudit.map((entry) => (
              <div
                key={entry.id}
                className="border-b border-slate-100 pb-4 last:border-0 last:pb-0"
              >
                <div className="flex flex-wrap justify-between gap-2">
                  <p className="text-sm font-semibold text-[#071e55]">
                    {entry.actor}
                  </p>
                  <span className="text-xs text-slate-400">
                    {format.dateTime(entry.occurredAt, {
                      dateStyle: "medium",
                      timeStyle: "short",
                    })}
                  </span>
                </div>
                <p className="mt-1 text-xs text-slate-500">
                  {growth(`auditActions.${entry.action}`)} · {entry.target}
                </p>
              </div>
            ))}
          </div>
        </article>
      </section>
    </RoleDashboardShell>
  );
}
