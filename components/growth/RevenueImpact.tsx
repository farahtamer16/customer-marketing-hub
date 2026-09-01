"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import {
  Award,
  BadgeDollarSign,
  ChartNoAxesCombined,
  CircleDollarSign,
  Eye,
  HeartHandshake,
  Pencil,
  Plus,
  Target,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import PageHeader from "@/components/hub/PageHeader";
import { api } from "@/convex/_generated/api";
import type { CampaignImpact, GrowthAccount } from "@/types/growth";
import { DemoModeBanner, MetricCard, SourcePill } from "./GrowthPrimitives";
import NewCampaignDialog from "./NewCampaignDialog";
import {
  computeActivationRate,
  computeCacHealthScore,
  computeChurnRate,
  computeCostPerLead,
  computeCostPerResult,
  computeRetentionRate,
  computeROI,
  computeSalesCycleHealthScore,
} from "@/lib/growth-metrics";

const EMPTY_CAMPAIGNS: CampaignImpact[] = [];
const EMPTY_ACCOUNTS: GrowthAccount[] = [];

export default function RevenueImpact() {
  const t = useTranslations("growth");
  const format = useFormatter();
  const campaignImpact = (useQuery(api.campaigns.listCampaigns) ??
    EMPTY_CAMPAIGNS) as CampaignImpact[];
  const growthAccounts = (useQuery(api.growth.listAccounts) ??
    EMPTY_ACCOUNTS) as GrowthAccount[];
  const [newCampaignOpen, setNewCampaignOpen] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState<CampaignImpact | null>(null);
  const totals = campaignImpact.reduce(
    (result, campaign) => ({
      spend: result.spend + campaign.spend,
      pipeline: result.pipeline + campaign.pipeline,
      customers: result.customers + campaign.customers,
      retained: result.retained + campaign.retained,
      ltv: result.ltv + campaign.ltv,
    }),
    { spend: 0, pipeline: 0, customers: 0, retained: 0, ltv: 0 },
  );
  const maxPipeline = Math.max(
    1,
    ...campaignImpact.map((campaign) => campaign.pipeline),
  );
  const totalAccountsReached = campaignImpact.reduce(
    (sum, campaign) => sum + campaign.accounts,
    0,
  );
  const conversion = totalAccountsReached
    ? totals.customers / totalAccountsReached
    : 0;
  const retention = totals.customers ? totals.retained / totals.customers : 0;
  const efficiency = totals.spend ? totals.pipeline / totals.spend : 0;
  const churnRate = computeChurnRate(campaignImpact);
  const roi = computeROI(campaignImpact);
  const cpl = computeCostPerLead(campaignImpact);
  const cpr = computeCostPerResult(campaignImpact);

  return (
    <>
      <PageHeader
        eyebrow={t("revenue.eyebrow")}
        title={t("revenue.title")}
        description={t("revenue.description")}
        action={
          <button
            type="button"
            onClick={() => setNewCampaignOpen(true)}
            className="inline-flex items-center gap-2 rounded-xl bg-[#173b9a] px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-900/15"
          >
            <Plus size={16} /> {t("revenue.newCampaign")}
          </button>
        }
      />
      <DemoModeBanner />

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          icon={CircleDollarSign}
          label={t("revenue.pipeline")}
          value={format.number(totals.pipeline, {
            style: "currency",
            currency: "USD",
            notation: "compact",
          })}
        />
        <MetricCard
          icon={ChartNoAxesCombined}
          label={t("revenue.conversion")}
          value={format.number(conversion, { style: "percent" })}
          tone="bg-violet-50 text-violet-700"
        />
        <MetricCard
          icon={HeartHandshake}
          label={t("revenue.retention")}
          value={format.number(retention, {
            style: "percent",
          })}
          tone="bg-emerald-50 text-emerald-700"
        />
        <MetricCard
          icon={BadgeDollarSign}
          label={t("revenue.ltv")}
          value={format.number(totals.ltv, {
            style: "currency",
            currency: "USD",
            notation: "compact",
          })}
          tone="bg-amber-50 text-amber-700"
        />
      </section>

      <section className="mt-6">
        <h2 className="mb-3 text-sm font-semibold text-[#071e55]">
          {t("revenue.unitEconomics")}
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            icon={TrendingDown}
            label={t("revenue.churnRate")}
            value={churnRate === null ? t("metrics.noDataYet") : `${Math.round(churnRate)}%`}
            tone="bg-rose-50 text-rose-700"
          />
          <MetricCard
            icon={TrendingUp}
            label={t("revenue.roi")}
            value={roi === null ? t("metrics.noDataYet") : `${Math.round(roi)}%`}
            tone="bg-emerald-50 text-emerald-700"
          />
          <MetricCard
            icon={Target}
            label={t("revenue.cpl")}
            value={
              cpl === null
                ? t("metrics.noDataYet")
                : format.number(cpl, { style: "currency", currency: "USD", notation: "compact" })
            }
            tone="bg-violet-50 text-violet-700"
          />
          <MetricCard
            icon={Award}
            label={t("revenue.cpr")}
            value={
              cpr === null
                ? t("metrics.noDataYet")
                : format.number(cpr, { style: "currency", currency: "USD", notation: "compact" })
            }
            tone="bg-amber-50 text-amber-700"
          />
        </div>
      </section>

      <section className="mt-6 grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <article className="glass-card rounded-3xl p-6">
          <div>
            <h2 className="font-semibold text-[#071e55]">
              {t("revenue.campaignImpact")}
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              {t("revenue.campaignImpactHint")}
            </p>
          </div>
          <div className="mt-6 space-y-5">
            {campaignImpact.map((campaign) => (
              <div key={campaign.id}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-semibold text-[#071e55]">
                        {campaign.name}
                      </p>
                      <SourcePill source={campaign.channel} />
                    </div>
                    <p className="mt-1 text-xs text-slate-400">
                      {t("revenue.campaignSummary", {
                        accounts: campaign.accounts,
                        customers: campaign.customers,
                        retained: campaign.retained,
                      })}
                    </p>
                    {campaign.postIds && campaign.postIds.length > 0 && (
                      <p className="mt-1 flex items-center gap-1.5 text-xs text-[#3156dc]">
                        <Eye size={12} className="flex-none" />
                        {campaign.postsWithData ? (
                          t("revenue.socialPerformance", {
                            reach: format.number(campaign.socialReach ?? 0, {
                              notation: "compact",
                            }),
                            impressions: format.number(
                              campaign.socialImpressions ?? 0,
                              { notation: "compact" },
                            ),
                            engagement: format.number(
                              campaign.socialEngagement ?? 0,
                              { notation: "compact" },
                            ),
                          })
                        ) : (
                          <span className="text-slate-400">
                            {t("revenue.socialPerformanceNoData")}
                          </span>
                        )}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <p className="text-sm font-bold text-[#173b9a]">
                      {format.number(campaign.pipeline, {
                        style: "currency",
                        currency: "USD",
                        notation: "compact",
                      })}
                    </p>
                    <button
                      type="button"
                      onClick={() => setEditingCampaign(campaign)}
                      className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-[#173b9a]"
                      aria-label={t("revenue.editCampaign")}
                    >
                      <Pencil size={14} />
                    </button>
                  </div>
                </div>
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-[#3156dc] to-[#7b8ef7]"
                    style={{
                      width: `${(campaign.pipeline / maxPipeline) * 100}%`,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </article>

        <div className="space-y-6">
          <article className="overflow-hidden rounded-3xl bg-gradient-to-br from-[#123486] via-[#3156dc] to-[#6e84f8] p-6 text-white shadow-xl shadow-blue-900/15">
            <p className="text-[0.65rem] font-bold uppercase tracking-[0.18em] text-[#c4ffe6]">
              {t("revenue.efficiency")}
            </p>
            <h2 className="mt-3 text-2xl font-semibold">
              {format.number(efficiency, {
                maximumFractionDigits: 1,
              })}
              ×
            </h2>
            <p className="mt-2 text-sm text-blue-100">
              {t("revenue.pipelinePerDollar")}
            </p>
            <div className="mt-6 grid grid-cols-2 gap-3">
              <div className="rounded-2xl bg-white/10 p-4">
                <p className="text-xl font-semibold">
                  {format.number(totals.spend, {
                    style: "currency",
                    currency: "USD",
                    notation: "compact",
                  })}
                </p>
                <p className="mt-1 text-xs text-blue-100">
                  {t("revenue.totalSpend")}
                </p>
              </div>
              <div className="rounded-2xl bg-white/10 p-4">
                <p className="text-xl font-semibold">{totals.customers}</p>
                <p className="mt-1 text-xs text-blue-100">
                  {t("revenue.newCustomers")}
                </p>
              </div>
            </div>
          </article>

          <article className="glass-card rounded-3xl p-6">
            <h2 className="font-semibold text-[#071e55]">
              {t("revenue.outcomes")}
            </h2>
            <div className="mt-5 space-y-4">
              {(
                [
                  { label: t("revenue.lowerCac"), value: computeCacHealthScore(campaignImpact) },
                  {
                    label: t("revenue.shorterCycle"),
                    value: computeSalesCycleHealthScore(growthAccounts),
                  },
                  {
                    label: t("revenue.activation"),
                    value: computeActivationRate(growthAccounts),
                  },
                  { label: t("revenue.retention"), value: computeRetentionRate(campaignImpact) },
                ] as { label: string; value: number | null }[]
              ).map(({ label, value }) => (
                <div key={label}>
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-500">{label}</span>
                    <span className="font-bold text-[#071e55]">
                      {value === null ? t("metrics.noDataYet") : `${Math.round(value)}%`}
                    </span>
                  </div>
                  <div className="mt-2 h-1.5 rounded-full bg-slate-100">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-[#3156dc] to-[#6fd7b6]"
                      style={{ width: `${value ?? 0}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </article>
        </div>
      </section>
      <NewCampaignDialog open={newCampaignOpen} onClose={() => setNewCampaignOpen(false)} />
      <NewCampaignDialog
        key={editingCampaign?.id ?? "no-campaign"}
        open={editingCampaign !== null}
        onClose={() => setEditingCampaign(null)}
        campaign={editingCampaign ?? undefined}
      />
    </>
  );
}
