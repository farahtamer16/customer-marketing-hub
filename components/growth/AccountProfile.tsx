"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowUpRight,
  Building2,
  CheckCircle2,
  CircleDollarSign,
  Lightbulb,
  Mail,
  UsersRound,
  Wand2,
} from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import type { GrowthAccount } from "@/types/growth";
import { journeyStages } from "@/lib/growth-data";
import {
  AccountAvatar,
  ConnectedSignalBadge,
  DemoModeBanner,
  MetricCard,
  ScoreMeter,
  SourcePill,
  StagePill,
} from "./GrowthPrimitives";
import LogSignalDialog from "./LogSignalDialog";
import PersonalizeOutreachDialog from "./PersonalizeOutreachDialog";

export default function AccountProfile({
  account,
}: {
  account: GrowthAccount;
}) {
  const t = useTranslations("growth");
  const format = useFormatter();
  const [logSignalOpen, setLogSignalOpen] = useState(false);
  const [outreachOpen, setOutreachOpen] = useState(false);

  return (
    <div className="space-y-6">
      <Link
        href="/growth/accounts"
        className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-[#173b9a]"
      >
        <ArrowLeft className="rtl:rotate-180" size={16} />
        {t("accountDetail.back")}
      </Link>
      <DemoModeBanner />

      <section className="glass-card overflow-hidden rounded-3xl">
        <div className="h-1.5 bg-gradient-to-r from-[#173b9a] via-[#526ff2] to-[#a9ffe0]" />
        <div className="p-6 sm:p-8">
          <div className="flex flex-wrap items-start justify-between gap-5">
            <div className="flex items-center gap-4">
              <AccountAvatar name={account.name} />
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-2xl font-semibold tracking-[-0.04em] text-[#071e55]">
                    {account.name}
                  </h1>
                  <StagePill stage={account.stage} />
                </div>
                <p className="mt-1 text-sm text-slate-500">
                  {account.domain} · {account.industry}
                </p>
              </div>
            </div>
            <div className="text-start sm:text-end">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">
                {t("accountDetail.owner")}
              </p>
              <p className="mt-1 text-sm font-semibold text-[#071e55]">
                {account.owner}
              </p>
            </div>
          </div>
          <div className="mt-7 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <ScoreMeter
              label={t("scores.intent")}
              value={account.intentScore}
            />
            <ScoreMeter
              label={t("scores.engagement")}
              value={account.engagementScore}
            />
            <ScoreMeter
              label={t("scores.adoption")}
              value={account.adoptionScore}
            />
            <ScoreMeter
              label={t("scores.coverage")}
              value={account.buyingGroupCoverage}
            />
          </div>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          icon={CircleDollarSign}
          label={t("accounts.pipeline")}
          value={format.number(account.pipelineValue, {
            style: "currency",
            currency: "USD",
            notation: "compact",
          })}
        />
        <MetricCard
          icon={Building2}
          label={t("accountDetail.companySize")}
          value={format.number(account.employees)}
        />
        <MetricCard
          icon={UsersRound}
          label={t("accountDetail.knownPeople")}
          value={String(
            account.members.filter((member) => member.status !== "missing")
              .length,
          )}
        />
        <MetricCard
          icon={CheckCircle2}
          label={t("accountDetail.projectedLtv")}
          value={format.number(account.ltv, {
            style: "currency",
            currency: "USD",
            notation: "compact",
          })}
        />
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <article className="glass-card rounded-3xl p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-semibold text-[#071e55]">
                {t("accountDetail.journey")}
              </h2>
              <p className="mt-1 text-xs text-slate-500">
                {t("accountDetail.journeyHint")}
              </p>
            </div>
            <ConnectedSignalBadge />
          </div>

          <div className="mt-6 flex overflow-x-auto pb-2">
            {journeyStages.map((stage, index) => {
              const activeIndex = journeyStages.indexOf(account.stage);
              const reached = index <= activeIndex;
              return (
                <div key={stage} className="flex min-w-28 flex-1 items-center">
                  <div className="min-w-0 flex-1">
                    <span
                      className={`grid h-8 w-8 place-items-center rounded-full text-xs font-bold ${reached ? "bg-[#3156dc] text-white" : "bg-slate-100 text-slate-400"}`}
                    >
                      {index + 1}
                    </span>
                    <p
                      className={`mt-2 text-xs font-semibold ${reached ? "text-[#173b9a]" : "text-slate-400"}`}
                    >
                      {t(`stages.${stage}`)}
                    </p>
                  </div>
                  {index < journeyStages.length - 1 && (
                    <span
                      className={`-ms-10 me-2 h-px flex-1 ${index < activeIndex ? "bg-[#3156dc]" : "bg-slate-200"}`}
                    />
                  )}
                </div>
              );
            })}
          </div>

          <div className="mt-7 space-y-3 border-t border-slate-100 pt-6">
            {account.signals
              .slice()
              .sort((a, b) => b.occurredAt - a.occurredAt)
              .map((signal) => (
                <div
                  key={signal.id}
                  className="flex items-start gap-4 rounded-2xl bg-white/65 p-4"
                >
                  <span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-[#486bf5] shadow-[0_0_0_5px_rgba(72,107,245,0.1)]" />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-semibold text-[#071e55]">
                        {t(`signals.${signal.kind}`)}
                      </p>
                      <SourcePill source={signal.source} />
                    </div>
                    <p className="mt-1 text-xs text-slate-400">
                      {format.dateTime(signal.occurredAt, {
                        dateStyle: "medium",
                        timeStyle: "short",
                      })}
                    </p>
                  </div>
                  {signal.source === "social" && (
                    <Link
                      href="/posts"
                      className="inline-flex items-center gap-1 text-xs font-bold text-[#2854dc]"
                    >
                      {t("accountDetail.viewSocial")} <ArrowUpRight size={13} />
                    </Link>
                  )}
                </div>
              ))}
          </div>
        </article>

        <div className="space-y-6">
          <article className="overflow-hidden rounded-3xl bg-gradient-to-br from-[#112f7d] via-[#3156dc] to-[#6d83f8] p-6 text-white shadow-xl shadow-blue-900/15">
            <span className="grid h-11 w-11 place-items-center rounded-2xl bg-white/15">
              <Lightbulb size={20} />
            </span>
            <p className="mt-6 text-[0.65rem] font-bold uppercase tracking-[0.18em] text-[#c4ffe6]">
              {t("accountDetail.nextBestAction")}
            </p>
            <h2 className="mt-2 text-xl font-semibold">
              {t(`actions.${account.nextAction}`)}
            </h2>
            <p className="mt-3 text-sm leading-6 text-blue-100">
              {t(`actionReasons.${account.nextAction}`)}
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => setLogSignalOpen(true)}
                className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-[#173b9a]"
              >
                {t("accountDetail.logSignal")} <ArrowUpRight size={15} />
              </button>
              <button
                type="button"
                onClick={() => setOutreachOpen(true)}
                className="inline-flex items-center gap-2 rounded-xl border border-white/40 bg-white/10 px-4 py-2.5 text-sm font-semibold text-white hover:bg-white/20"
              >
                <Wand2 size={15} /> {t("outreach.openButton")}
              </button>
            </div>
          </article>

          <article className="glass-card rounded-3xl p-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-semibold text-[#071e55]">
                  {t("accountDetail.buyingGroup")}
                </h2>
                <p className="mt-1 text-xs text-slate-500">
                  {t("accountDetail.accountVsPeople")}
                </p>
              </div>
              <span className="text-sm font-bold text-[#3156dc]">
                {account.buyingGroupCoverage}%
              </span>
            </div>
            <div className="mt-5 space-y-3">
              {account.members.map((member) => (
                <div
                  key={member.id}
                  className={`rounded-2xl border p-4 ${member.status === "missing" ? "border-dashed border-slate-200 bg-slate-50/70" : member.status === "atRisk" ? "border-amber-200 bg-amber-50/45" : "border-slate-100 bg-white/70"}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-[#071e55]">
                        {member.name}
                      </p>
                      <p className="mt-1 text-xs text-slate-400">
                        {member.title}
                      </p>
                    </div>
                    <span className="rounded-full bg-blue-50 px-2.5 py-1 text-[0.62rem] font-bold text-blue-700">
                      {t(`roles.${member.role}`)}
                    </span>
                  </div>
                  {member.email && (
                    <p className="mt-3 inline-flex items-center gap-1.5 text-[0.68rem] text-slate-500">
                      <Mail size={12} /> {member.email}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </article>
        </div>
      </section>
      <LogSignalDialog
        open={logSignalOpen}
        onClose={() => setLogSignalOpen(false)}
        accountId={account.id}
      />
      <PersonalizeOutreachDialog
        key={account.id}
        open={outreachOpen}
        onClose={() => setOutreachOpen(false)}
        account={account}
      />
    </div>
  );
}
