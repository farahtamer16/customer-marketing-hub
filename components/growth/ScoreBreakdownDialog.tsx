"use client";

import { useEffect } from "react";
import { useQuery } from "convex/react";
import { ListTree, X } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import type { SignalKind } from "@/types/growth";

function ContributionRow({
  kind,
  detail,
  occurredAt,
  recencyFactor,
  contribution,
}: {
  kind: SignalKind;
  detail?: string;
  occurredAt: number;
  recencyFactor: number;
  contribution: number;
}) {
  const t = useTranslations("growth");
  const format = useFormatter();
  const positive = contribution >= 0;
  return (
    <div className="flex items-start justify-between gap-3 rounded-xl bg-slate-50/80 px-3 py-2 text-xs">
      <div className="min-w-0 flex-1">
        <p className="font-semibold text-slate-700">{t(`signals.${kind}`)}</p>
        {detail && <p className="mt-0.5 truncate text-slate-400">{detail}</p>}
        <p className="mt-0.5 text-slate-400">
          {format.dateTime(occurredAt, { dateStyle: "medium" })} ·{" "}
          {t("scoreBreakdown.recencyFactor", { factor: Math.round(recencyFactor * 100) })}
        </p>
      </div>
      <span
        className={`shrink-0 font-bold ${positive ? "text-emerald-600" : "text-rose-600"}`}
      >
        {positive ? "+" : ""}
        {contribution}
      </span>
    </div>
  );
}

export default function ScoreBreakdownDialog({
  open,
  onClose,
  accountId,
}: {
  open: boolean;
  onClose: () => void;
  accountId: string;
}) {
  const t = useTranslations("growth");
  const breakdown = useQuery(
    api.growth.getScoreBreakdown,
    open ? { accountId: accountId as Id<"growthAccounts"> } : "skip",
  );

  useEffect(() => {
    if (!open) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [onClose, open]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[80] grid place-items-center bg-slate-950/45 p-4 backdrop-blur-sm"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="score-breakdown-title"
        className="w-full max-w-xl overflow-hidden rounded-3xl bg-white shadow-2xl"
      >
        <div className="flex items-start justify-between border-b border-slate-100 px-6 py-5">
          <div className="flex gap-3">
            <span className="grid h-11 w-11 place-items-center rounded-2xl bg-blue-50 text-[#3156dc]">
              <ListTree size={20} />
            </span>
            <div>
              <h2 id="score-breakdown-title" className="font-semibold text-[#071e55]">
                {t("scoreBreakdown.title")}
              </h2>
              <p className="mt-1 text-xs text-slate-500">
                {t("scoreBreakdown.description")}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
            aria-label={t("outreach.close")}
          >
            <X size={18} />
          </button>
        </div>

        <div className="max-h-[70vh] space-y-6 overflow-y-auto p-6">
          {!breakdown ? (
            <p className="text-sm text-slate-500">{t("scoreBreakdown.loading")}</p>
          ) : (
            <>
              <section>
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-[#071e55]">
                    {t("scores.intent")}
                  </h3>
                  <span className="text-sm font-bold text-[#3156dc]">
                    {breakdown.intent.total}
                  </span>
                </div>
                <div className="mt-3 space-y-2">
                  {breakdown.intent.activeDecisionMakers > 0 && (
                    <div className="flex items-center justify-between rounded-xl bg-blue-50 px-3 py-2 text-xs">
                      <span className="font-semibold text-blue-700">
                        {t("scoreBreakdown.decisionMakers", {
                          count: breakdown.intent.activeDecisionMakers,
                        })}
                      </span>
                      <span className="font-bold text-blue-700">
                        +{breakdown.intent.decisionMakerBonus}
                      </span>
                    </div>
                  )}
                  {breakdown.intent.signals.length === 0 &&
                  breakdown.intent.activeDecisionMakers === 0 ? (
                    <p className="text-xs text-slate-400">{t("scoreBreakdown.noData")}</p>
                  ) : (
                    breakdown.intent.signals.map((signal) => (
                      <ContributionRow key={signal.signalId} {...signal} />
                    ))
                  )}
                </div>
              </section>

              <section>
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-[#071e55]">
                    {t("scores.engagement")}
                  </h3>
                  <span className="text-sm font-bold text-[#3156dc]">
                    {breakdown.engagement.total}
                  </span>
                </div>
                <div className="mt-3 space-y-2">
                  <div className="flex items-center justify-between rounded-xl bg-blue-50 px-3 py-2 text-xs">
                    <span className="font-semibold text-blue-700">
                      {t("scoreBreakdown.coverage", {
                        active: breakdown.engagement.activeMembers,
                        total: breakdown.engagement.totalMembers,
                      })}
                    </span>
                    <span className="font-bold text-blue-700">
                      +{breakdown.engagement.coverageBonus}
                    </span>
                  </div>
                  {breakdown.engagement.signals.length === 0 ? (
                    <p className="text-xs text-slate-400">{t("scoreBreakdown.noData")}</p>
                  ) : (
                    breakdown.engagement.signals.map((signal) => (
                      <ContributionRow key={signal.signalId} {...signal} />
                    ))
                  )}
                </div>
              </section>

              <section>
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-[#071e55]">
                    {t("scores.adoption")}
                  </h3>
                  <span className="text-sm font-bold text-[#3156dc]">
                    {breakdown.adoption.total}
                  </span>
                </div>
                <div className="mt-3 space-y-2">
                  {breakdown.adoption.signals.length === 0 ? (
                    <p className="text-xs text-slate-400">{t("scoreBreakdown.noAdoptionData")}</p>
                  ) : (
                    breakdown.adoption.signals.map((signal) => (
                      <ContributionRow key={signal.signalId} {...signal} />
                    ))
                  )}
                </div>
              </section>
            </>
          )}
        </div>
      </section>
    </div>
  );
}
