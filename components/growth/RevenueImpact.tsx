"use client";

import {
  BadgeDollarSign,
  ChartNoAxesCombined,
  CircleDollarSign,
  HeartHandshake,
} from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import PageHeader from "@/components/hub/PageHeader";
import { campaignImpact } from "@/lib/growth-data";
import { DemoModeBanner, MetricCard, SourcePill } from "./GrowthPrimitives";

export default function RevenueImpact() {
  const t = useTranslations("growth");
  const format = useFormatter();
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
    ...campaignImpact.map((campaign) => campaign.pipeline),
  );
  const conversion =
    campaignImpact.reduce((sum, campaign) => sum + campaign.customers, 0) /
    campaignImpact.reduce((sum, campaign) => sum + campaign.accounts, 0);

  return (
    <>
      <PageHeader
        eyebrow={t("revenue.eyebrow")}
        title={t("revenue.title")}
        description={t("revenue.description")}
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
          change="+21%"
        />
        <MetricCard
          icon={ChartNoAxesCombined}
          label={t("revenue.conversion")}
          value={format.number(conversion, { style: "percent" })}
          change="+8%"
          tone="bg-violet-50 text-violet-700"
        />
        <MetricCard
          icon={HeartHandshake}
          label={t("revenue.retention")}
          value={format.number(totals.retained / totals.customers, {
            style: "percent",
          })}
          change="+6%"
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
          change="+14%"
          tone="bg-amber-50 text-amber-700"
        />
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
                  </div>
                  <p className="text-sm font-bold text-[#173b9a]">
                    {format.number(campaign.pipeline, {
                      style: "currency",
                      currency: "USD",
                      notation: "compact",
                    })}
                  </p>
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
              {format.number(totals.pipeline / totals.spend, {
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
              {[
                [t("revenue.lowerCac"), 82],
                [t("revenue.shorterCycle"), 71],
                [t("revenue.activation"), 64],
                [t("revenue.retention"), 89],
              ].map(([label, value]) => (
                <div key={label as string}>
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-500">{label}</span>
                    <span className="font-bold text-[#071e55]">{value}%</span>
                  </div>
                  <div className="mt-2 h-1.5 rounded-full bg-slate-100">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-[#3156dc] to-[#6fd7b6]"
                      style={{ width: `${value}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </article>
        </div>
      </section>
    </>
  );
}
