"use client";

import { useState } from "react";
import Link from "next/link";
import { useMutation, useQuery } from "convex/react";
import {
  ArrowRight,
  ArrowUpRight,
  Building2,
  Headphones,
  Route,
  Sparkles,
  UserRound,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import PageHeader from "@/components/hub/PageHeader";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { journeyStages } from "@/lib/growth-data";
import type { GrowthAccount } from "@/types/growth";
import { AccountAvatar, DemoModeBanner } from "./GrowthPrimitives";

const consumerStages = [
  "firstVisit",
  "contentEngaged",
  "signedUp",
  "activated",
  "retained",
] as const;

const EMPTY_ACCOUNTS: GrowthAccount[] = [];

export default function JourneyWorkspace() {
  const t = useTranslations("growth");
  const [mode, setMode] = useState<"b2b" | "consumer">("b2b");
  const growthAccounts = (useQuery(api.growth.listAccounts) ??
    EMPTY_ACCOUNTS) as GrowthAccount[];
  // These two cards recommend a concrete next action, so they link to a
  // real account that action applies to right now — not a fixed example —
  // falling back to the account list when nothing currently matches.
  const demoAccount =
    growthAccounts
      .filter((account) => account.nextAction === "bookExecutiveDemo")
      .sort((a, b) => b.intentScore - a.intentScore)[0] ??
    [...growthAccounts].sort((a, b) => b.intentScore - a.intentScore)[0];
  const supportAccount = growthAccounts.find(
    (account) => account.nextAction === "resolveSupportBlocker",
  );

  return (
    <>
      <PageHeader
        eyebrow={t("journeys.eyebrow")}
        title={t("journeys.title")}
        description={t("journeys.description")}
      />
      <DemoModeBanner />

      <section className="glass-card rounded-3xl p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex rounded-2xl bg-slate-100 p-1">
            {(["b2b", "consumer"] as const).map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setMode(value)}
                className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold ${mode === value ? "bg-white text-[#173b9a] shadow-sm" : "text-slate-500"}`}
              >
                {value === "b2b" ? (
                  <Building2 size={16} />
                ) : (
                  <UserRound size={16} />
                )}
                {t(`journeys.${value}`)}
              </button>
            ))}
          </div>
          <span className="rounded-full border border-blue-100 bg-blue-50 px-3 py-1.5 text-[0.68rem] font-bold uppercase tracking-[0.12em] text-blue-700">
            {t("journeys.adminView")}
          </span>
        </div>

        <div className="mt-6 rounded-2xl border border-white bg-white/55 p-5">
          <div className="flex items-start gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#eaf0ff] text-[#3556d9]">
              <Route size={18} />
            </span>
            <div>
              <h2 className="font-semibold text-[#071e55]">
                {mode === "b2b"
                  ? t("journeys.b2bTitle")
                  : t("journeys.consumerTitle")}
              </h2>
              <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-500">
                {mode === "b2b"
                  ? t("journeys.b2bExplanation")
                  : t("journeys.consumerExplanation")}
              </p>
            </div>
          </div>
        </div>

        {mode === "b2b" ? <B2BJourney /> : <ConsumerJourney />}
      </section>

      <section className="mt-6 grid gap-6 lg:grid-cols-2">
        <article className="overflow-hidden rounded-3xl bg-gradient-to-br from-[#123486] via-[#3156dc] to-[#6e84f8] p-6 text-white shadow-xl shadow-blue-900/15">
          <Sparkles size={20} className="text-[#c4ffe6]" />
          <p className="mt-5 text-[0.65rem] font-bold uppercase tracking-[0.18em] text-[#c4ffe6]">
            {t("journeys.recommendedAction")}
          </p>
          <h2 className="mt-2 text-xl font-semibold">
            {t("actions.bookExecutiveDemo")}
          </h2>
          <p className="mt-3 text-sm leading-6 text-blue-100">
            {t("journeys.recommendedReason")}
          </p>
          <Link
            href={demoAccount ? `/growth/accounts/${demoAccount.id}` : "/growth/accounts"}
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-[#173b9a]"
          >
            {t("journeys.reviewAccount")} <ArrowUpRight size={15} />
          </Link>
        </article>

        <article className="glass-card rounded-3xl p-6">
          <span className="grid h-11 w-11 place-items-center rounded-2xl bg-rose-50 text-rose-600">
            <Headphones size={20} />
          </span>
          <p className="mt-5 text-[0.65rem] font-bold uppercase tracking-[0.18em] text-rose-500">
            {t("journeys.supportAction")}
          </p>
          <h2 className="mt-2 text-xl font-semibold text-[#071e55]">
            {t("actions.resolveSupportBlocker")}
          </h2>
          <p className="mt-3 text-sm leading-6 text-slate-500">
            {t("journeys.supportReason")}
          </p>
          <Link
            href={supportAccount ? `/growth/accounts/${supportAccount.id}` : "/growth/accounts"}
            className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-[#2854dc]"
          >
            {t("journeys.openSupportContext")} <ArrowUpRight size={15} />
          </Link>
        </article>
      </section>
    </>
  );
}

function B2BJourney() {
  const t = useTranslations("growth");
  const growthAccounts = (useQuery(api.growth.listAccounts) ??
    []) as GrowthAccount[];
  const updateAccount = useMutation(api.growth.updateAccount);

  const advanceStage = async (account: GrowthAccount) => {
    const index = journeyStages.indexOf(account.stage);
    const nextStage = journeyStages[index + 1];
    if (!nextStage) return;
    try {
      await updateAccount({
        accountId: account.id as Id<"growthAccounts">,
        stage: nextStage,
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("journeys.advanceFailed"));
    }
  };

  return (
    <div className="mt-6 overflow-x-auto pb-2">
      <div className="grid min-w-[1050px] grid-cols-7 gap-3">
        {journeyStages.map((stage, index) => {
          const accounts = growthAccounts.filter(
            (account) => account.stage === stage,
          );
          const isLastStage = index === journeyStages.length - 1;
          return (
            <div
              key={stage}
              className="min-h-64 rounded-2xl bg-slate-50/80 p-3"
            >
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-bold text-[#071e55]">
                  {t(`stages.${stage}`)}
                </p>
                <span className="text-[0.62rem] font-bold text-slate-400">
                  {String(index + 1).padStart(2, "0")}
                </span>
              </div>
              <p className="mt-2 min-h-10 text-[0.65rem] leading-4 text-slate-400">
                {t(`journeys.stageHints.${stage}`)}
              </p>
              <div className="mt-3 space-y-2">
                {accounts.map((account) => (
                  <div
                    key={account.id}
                    className="rounded-xl border border-white bg-white p-3 shadow-sm hover:border-blue-200"
                  >
                    <Link
                      href={`/growth/accounts/${account.id}`}
                      className="flex items-center gap-2"
                    >
                      <AccountAvatar name={account.name} />
                      <div className="min-w-0">
                        <p className="truncate text-xs font-semibold text-[#071e55]">
                          {account.name}
                        </p>
                        <p className="mt-0.5 text-[0.6rem] text-slate-400">
                          {t("scores.intent")} {account.intentScore}
                        </p>
                      </div>
                    </Link>
                    {!isLastStage && (
                      <button
                        type="button"
                        onClick={() => advanceStage(account)}
                        className="mt-2 inline-flex items-center gap-1 text-[0.62rem] font-bold text-[#2854dc] hover:text-[#173b9a]"
                      >
                        {t("journeys.advanceStage")} <ArrowRight size={11} className="rtl:rotate-180" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ConsumerJourney() {
  const t = useTranslations("growth");
  const funnel = useQuery(api.consumerJourney.listFunnel);
  const totalVisitors = funnel
    ? Object.values(funnel).reduce((sum: number, count: number) => sum + count, 0)
    : 0;

  return (
    <div className="mt-6">
      {funnel !== undefined && totalVisitors === 0 && (
        <p className="mb-3 rounded-xl bg-amber-50 px-4 py-2.5 text-xs font-medium text-amber-800">
          {t("journeys.consumerNoData")}
        </p>
      )}
      <div className="grid gap-3 md:grid-cols-5">
        {consumerStages.map((stage, index) => (
          <article key={stage} className="rounded-2xl bg-slate-50/80 p-4">
            <div className="flex items-center justify-between">
              <span className="grid h-8 w-8 place-items-center rounded-full bg-white text-xs font-bold text-[#3556d9] shadow-sm">
                {index + 1}
              </span>
              <span className="text-lg font-semibold text-[#071e55]">
                {funnel ? funnel[stage] : "—"}
              </span>
            </div>
            <h3 className="mt-4 text-sm font-semibold text-[#071e55]">
              {t(`journeys.consumerStages.${stage}`)}
            </h3>
            <p className="mt-2 text-xs leading-5 text-slate-500">
              {t(`journeys.consumerHints.${stage}`)}
            </p>
          </article>
        ))}
      </div>
    </div>
  );
}
