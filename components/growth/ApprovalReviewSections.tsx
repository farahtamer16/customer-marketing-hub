"use client";

import { Check, Clock3, MessageSquareText, X } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import type {
  ApprovalHistoryEntry,
  ApprovalPost,
  ApprovalStep,
} from "@/types/workflow";
import { WorkspaceRolePill } from "./TeamPrimitives";

export function ApprovalPostPreview({
  content,
}: Pick<ApprovalPost, "content">) {
  const t = useTranslations("growth.approvalReview");
  return (
    <article className="glass-card rounded-3xl p-6">
      <p className="text-[0.65rem] font-bold uppercase tracking-[0.16em] text-[#3156dc]">
        {t("postPreview")}
      </p>
      <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center gap-3 p-4">
          <span className="grid h-10 w-10 place-items-center rounded-full bg-gradient-to-br from-[#c4ffe6] to-[#7590ff] text-xs font-bold text-[#09276b]">
            SA
          </span>
          <div>
            <p className="text-sm font-semibold text-[#071e55]">Spiders AI</p>
            <p className="text-xs text-slate-400">{t("previewTime")}</p>
          </div>
        </div>
        <p className="px-4 pb-5 text-sm leading-6 text-slate-700">{content}</p>
        <div className="grid aspect-[16/8] place-items-center bg-gradient-to-br from-[#d8fff0] via-[#e7efff] to-[#6f83f6]">
          <p className="max-w-sm px-8 text-center text-2xl font-semibold tracking-[-0.04em] text-[#09276b]">
            {t("creativePlaceholder")}
          </p>
        </div>
        <div className="flex justify-around border-t border-slate-100 px-3 py-3 text-xs font-semibold text-slate-400">
          {(["like", "comment", "share"] as const).map((action) => (
            <span key={action}>{t(action)}</span>
          ))}
        </div>
      </div>
    </article>
  );
}

const stepIcons = { approved: Check, rejected: X, current: Clock3 };

export function ApprovalWorkflow({ steps }: { steps: ApprovalStep[] }) {
  const t = useTranslations("growth");
  return (
    <article className="glass-card rounded-3xl p-6">
      <h2 className="font-semibold text-[#071e55]">
        {t("approvalReview.workflow")}
      </h2>
      <div className="mt-5 space-y-3">
        {steps.map((step, index) => {
          const Icon =
            step.status === "waiting" ? null : stepIcons[step.status];
          return (
            <div
              key={step.id}
              className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-white/70 p-4"
            >
              <span
                className={`grid h-8 w-8 place-items-center rounded-full ${step.status === "approved" ? "bg-emerald-500 text-white" : step.status === "rejected" ? "bg-rose-500 text-white" : step.status === "current" ? "bg-[#3156dc] text-white" : "bg-slate-100 text-slate-400"}`}
              >
                {Icon ? <Icon size={14} /> : index + 1}
              </span>
              <div className="min-w-0 flex-1">
                <WorkspaceRolePill role={step.role} />
                <p className="mt-1 text-xs text-slate-500">{step.assignee}</p>
              </div>
              <span className="text-xs font-semibold text-slate-400">
                {t(`approvalSteps.${step.status}`)}
              </span>
            </div>
          );
        })}
      </div>
    </article>
  );
}

export function ApprovalActivity({
  history,
}: {
  history: ApprovalHistoryEntry[];
}) {
  const t = useTranslations("growth");
  const format = useFormatter();
  return (
    <section className="glass-card mt-6 rounded-3xl p-6">
      <div className="flex items-center gap-3">
        <MessageSquareText size={18} className="text-[#3156dc]" />
        <h2 className="font-semibold text-[#071e55]">
          {t("approvalReview.activity")}
        </h2>
      </div>
      <div className="mt-5 space-y-4">
        {[...history].reverse().map((entry) => (
          <div
            key={entry.id}
            className="flex items-start gap-3 border-b border-slate-100 pb-4 last:border-0 last:pb-0"
          >
            <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-[#486bf5]" />
            <div className="min-w-0 flex-1">
              <p className="text-sm text-slate-700">
                <span className="font-semibold text-[#071e55]">
                  {entry.actor}
                </span>{" "}
                · {t(`approvalActions.${entry.action}`)}
              </p>
              {entry.note && (
                <p className="mt-2 rounded-xl bg-slate-50 px-3 py-2 text-xs leading-5 text-slate-600">
                  {entry.note}
                </p>
              )}
            </div>
            <span className="text-xs text-slate-400">
              {format.dateTime(entry.occurredAt, {
                dateStyle: "medium",
                timeStyle: "short",
              })}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}
