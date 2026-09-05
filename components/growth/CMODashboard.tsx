"use client";

import { useQuery } from "convex/react";
import {
  BellRing,
  CircleDollarSign,
  Gauge,
  LineChart,
  TrendingUp,
} from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import { api } from "@/convex/_generated/api";
import type { CampaignImpact, GrowthAccount } from "@/types/growth";
import { DashboardCard, RoleDashboardShell, WorkspaceDirectory } from "./DashboardPrimitives";
import { AccountAvatar, ScoreMeter, StagePill } from "./GrowthPrimitives";

export default function CMODashboard() {
  const t = useTranslations("growth.roleDashboards.cmo");
  const growth = useTranslations("growth");
  const format = useFormatter();
  const growthAccounts = (useQuery(api.growth.listAccounts, {}) ??
    []) as GrowthAccount[];
  const campaignImpact = (useQuery(api.campaigns.listCampaigns, {}) ??
    []) as CampaignImpact[];
  const workspaceNotifications = useQuery(api.notifications.listNotifications) ?? [];
  const totalPipeline = growthAccounts.reduce(
    (sum, account) => sum + account.pipelineValue,
    0,
  );
  const totalLtv = growthAccounts.reduce(
    (sum, account) => sum + account.ltv,
    0,
  );
  const trackedAccounts = campaignImpact.reduce(
    (sum, campaign) => sum + campaign.accounts,
    0,
  );
  const customers = campaignImpact.reduce(
    (sum, campaign) => sum + campaign.customers,
    0,
  );
  const spend = campaignImpact.reduce(
    (sum, campaign) => sum + campaign.spend,
    0,
  );
  const pipeline = campaignImpact.reduce(
    (sum, campaign) => sum + campaign.pipeline,
    0,
  );
  const accountScore = Math.round(
    growthAccounts.reduce((sum, account) => sum + account.intentScore, 0) /
      growthAccounts.length,
  );

  return (
    <RoleDashboardShell role="cmo">
      <WorkspaceDirectory role="cmo" />

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <DashboardCard
          icon={Gauge}
          title={t("accountScores")}
          description={t("accountScoresDescription")}
          value={String(accountScore)}
          href="/growth/accounts"
        />
        <DashboardCard
          icon={CircleDollarSign}
          title={t("pipeline")}
          description={t("pipelineDescription")}
          value={format.number(totalPipeline, {
            style: "currency",
            currency: "USD",
            notation: "compact",
          })}
          href="/growth/revenue"
        />
        <DashboardCard
          icon={TrendingUp}
          title={t("conversion")}
          description={t("conversionDescription")}
          value={`${Math.round((customers / trackedAccounts) * 100)}%`}
        />
        <DashboardCard
          icon={LineChart}
          title={t("campaignRoi")}
          description={t("campaignRoiDescription")}
          value={`${Math.round(((pipeline - spend) / spend) * 100)}%`}
          href="/growth/revenue"
        />
        <DashboardCard
          icon={CircleDollarSign}
          title={t("accountLtv")}
          description={t("accountLtvDescription")}
          value={format.number(totalLtv, {
            style: "currency",
            currency: "USD",
            notation: "compact",
          })}
        />
      </section>

      <section className="mt-6 grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <article className="glass-card rounded-3xl p-6">
          <h2 className="font-semibold text-[#071e55]">
            {t("accountPortfolio")}
          </h2>
          <div className="mt-5 space-y-3">
            {growthAccounts.map((account) => (
              <div
                key={account.id}
                className="flex flex-wrap items-center gap-4 rounded-2xl border border-slate-100 bg-white/70 p-4"
              >
                <AccountAvatar name={account.name} />
                <div className="min-w-40 flex-1">
                  <p className="text-sm font-semibold text-[#071e55]">
                    {account.name}
                  </p>
                  <div className="mt-2 max-w-52">
                    <ScoreMeter
                      label={growth("scores.intent")}
                      value={account.intentScore}
                      compact
                    />
                  </div>
                </div>
                <StagePill stage={account.stage} />
                <div className="text-end">
                  <p className="text-sm font-semibold text-[#071e55]">
                    {format.number(account.ltv, {
                      style: "currency",
                      currency: "USD",
                      notation: "compact",
                    })}
                  </p>
                  <p className="mt-1 text-[0.62rem] uppercase tracking-[0.12em] text-slate-400">
                    {t("ltv")}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </article>

        <article className="glass-card rounded-3xl p-6">
          <div className="flex items-center gap-3">
            <BellRing size={18} className="text-[#3156dc]" />
            <h2 className="font-semibold text-[#071e55]">
              {t("executiveAlerts")}
            </h2>
          </div>
          <div className="mt-5 space-y-4">
            {workspaceNotifications.slice(0, 3).map((alert) => (
              <div
                key={alert.id}
                className="border-b border-slate-100 pb-4 last:border-0 last:pb-0"
              >
                <p className="text-sm font-semibold text-[#071e55]">
                  {alert.title}
                </p>
                <p className="mt-1 text-xs leading-5 text-slate-500">
                  {alert.detail}
                </p>
              </div>
            ))}
          </div>
        </article>
      </section>
    </RoleDashboardShell>
  );
}
