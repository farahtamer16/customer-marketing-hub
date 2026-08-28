"use client";

import Link from "next/link";
import {
  ArrowUpRight,
  Building2,
  CircleDollarSign,
  Sparkles,
  TimerReset,
  UserCheck,
} from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import PageHeader from "@/components/hub/PageHeader";
import {
  AccountAvatar,
  DemoModeBanner,
  MetricCard,
  SourcePill,
  StagePill,
} from "./GrowthPrimitives";
import {
  growthAccounts,
  journeyStages,
  signalSources,
} from "@/lib/growth-data";

export default function GrowthDashboard() {
  const t = useTranslations("growth");
  const format = useFormatter();
  const prioritized = [...growthAccounts]
    .sort((a, b) => b.intentScore - a.intentScore)
    .slice(0, 3);
  const latestSignals = growthAccounts
    .flatMap((account) =>
      account.signals.map((signal) => ({ account, signal })),
    )
    .sort((a, b) => b.signal.occurredAt - a.signal.occurredAt)
    .slice(0, 5);
  const pipeline = growthAccounts.reduce(
    (total, account) => total + account.pipelineValue,
    0,
  );

  return (
    <>
      <PageHeader
        eyebrow={t("overview.eyebrow")}
        title={t("overview.title")}
        description={t("overview.description")}
        action={
          <Link
            href="/growth/accounts"
            className="inline-flex items-center gap-2 rounded-xl bg-[#173b9a] px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-900/15 hover:-translate-y-0.5"
          >
            {t("overview.viewAccounts")} <ArrowUpRight size={16} />
          </Link>
        }
      />
      <DemoModeBanner />

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          icon={CircleDollarSign}
          label={t("metrics.acquisitionCost")}
          value="$1.24K"
          change={t("metrics.down", { value: 18 })}
          tone="bg-emerald-50 text-emerald-700"
        />
        <MetricCard
          icon={TimerReset}
          label={t("metrics.salesCycle")}
          value={t("metrics.days", { value: 24 })}
          change={t("metrics.faster", { value: 9 })}
          tone="bg-violet-50 text-violet-700"
        />
        <MetricCard
          icon={UserCheck}
          label={t("metrics.activationRate")}
          value="64%"
          change={t("metrics.up", { value: 12 })}
          tone="bg-blue-50 text-blue-700"
        />
        <MetricCard
          icon={Building2}
          label={t("metrics.influencedPipeline")}
          value={format.number(pipeline, {
            style: "currency",
            currency: "USD",
            notation: "compact",
            maximumFractionDigits: 1,
          })}
          change={t("metrics.up", { value: 21 })}
          tone="bg-amber-50 text-amber-700"
        />
      </section>

      <section className="mt-6 grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <article className="glass-card overflow-hidden rounded-3xl">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/80 px-6 py-5">
            <div>
              <h2 className="font-semibold text-[#071e55]">
                {t("overview.accountJourney")}
              </h2>
              <p className="mt-1 text-xs text-slate-500">
                {t("overview.accountJourneyHint")}
              </p>
            </div>
            <Link
              href="/growth/journeys"
              className="text-xs font-bold text-[#2854dc]"
            >
              {t("overview.openJourney")}
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-px bg-slate-100 sm:grid-cols-4 xl:grid-cols-7">
            {journeyStages.map((stage, index) => {
              const count = growthAccounts.filter(
                (account) => account.stage === stage,
              ).length;
              return (
                <div key={stage} className="bg-white/90 p-4">
                  <p className="text-[0.62rem] font-bold uppercase tracking-[0.12em] text-slate-400">
                    {String(index + 1).padStart(2, "0")}
                  </p>
                  <p className="mt-3 text-sm font-semibold text-[#071e55]">
                    {t(`stages.${stage}`)}
                  </p>
                  <p className="mt-1 text-xs text-slate-400">
                    {t("overview.accountCount", { count })}
                  </p>
                </div>
              );
            })}
          </div>
          <div className="p-6">
            <div className="mb-4 flex items-center gap-2">
              <Sparkles size={16} className="text-[#3556d9]" />
              <h3 className="text-sm font-semibold text-[#071e55]">
                {t("overview.prioritizedAccounts")}
              </h3>
            </div>
            <div className="space-y-3">
              {prioritized.map((account) => (
                <Link
                  key={account.id}
                  href={`/growth/accounts/${account.id}`}
                  className="flex flex-wrap items-center gap-4 rounded-2xl border border-slate-100 bg-white/65 p-4 hover:border-blue-200 hover:bg-blue-50/40"
                >
                  <AccountAvatar name={account.name} />
                  <div className="min-w-40 flex-1">
                    <p className="text-sm font-semibold text-[#071e55]">
                      {account.name}
                    </p>
                    <p className="mt-1 text-xs text-slate-400">
                      {t("overview.owner", { name: account.owner })}
                    </p>
                  </div>
                  <StagePill stage={account.stage} />
                  <div className="min-w-24 text-end">
                    <p className="text-lg font-semibold text-[#173b9a]">
                      {account.intentScore}
                    </p>
                    <p className="text-[0.62rem] uppercase tracking-[0.12em] text-slate-400">
                      {t("scores.intent")}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </article>

        <div className="space-y-6">
          <article className="overflow-hidden rounded-3xl bg-gradient-to-br from-[#123486] via-[#3156dc] to-[#6e84f8] p-6 text-white shadow-2xl shadow-blue-900/20">
            <p className="text-[0.65rem] font-bold uppercase tracking-[0.18em] text-[#c4ffe6]">
              {t("overview.unifiedData")}
            </p>
            <h2 className="mt-3 text-2xl font-semibold tracking-[-0.035em]">
              {t("overview.oneCustomerView")}
            </h2>
            <p className="mt-2 text-sm leading-6 text-blue-100">
              {t("overview.oneCustomerViewHint")}
            </p>
            <div className="mt-6 flex flex-wrap gap-2">
              {signalSources.map((source) => (
                <SourcePill key={source} source={source} />
              ))}
            </div>
          </article>

          <article className="glass-card rounded-3xl p-6">
            <h2 className="font-semibold text-[#071e55]">
              {t("overview.latestSignals")}
            </h2>
            <div className="mt-4 space-y-4">
              {latestSignals.map(({ account, signal }) => (
                <Link
                  key={signal.id}
                  href={`/growth/accounts/${account.id}`}
                  className="flex items-start gap-3"
                >
                  <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-[#486bf5] shadow-[0_0_0_4px_rgba(72,107,245,0.1)]" />
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-semibold text-[#071e55]">
                        {account.name}
                      </span>
                      <SourcePill source={signal.source} />
                    </span>
                    <span className="mt-1 block text-xs text-slate-500">
                      {t(`signals.${signal.kind}`)}
                    </span>
                  </span>
                  <ArrowUpRight size={14} className="text-slate-300" />
                </Link>
              ))}
            </div>
          </article>
        </div>
      </section>
    </>
  );
}
