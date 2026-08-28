"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, RotateCcw } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import type {
  ApprovalHistoryEntry,
  ApprovalPost,
  ApprovalStatus,
} from "@/types/workflow";
import { PrototypeNotices } from "./TeamPrimitives";
import { ApprovalStatusPill, ChannelPills } from "./WorkflowPrimitives";
import {
  ApprovalActivity,
  ApprovalPostPreview,
  ApprovalWorkflow,
} from "./ApprovalReviewSections";

export default function ApprovalReview({ post }: { post: ApprovalPost }) {
  const t = useTranslations("growth");
  const format = useFormatter();
  const [status, setStatus] = useState<ApprovalStatus>(post.status);
  const [note, setNote] = useState("");
  const [history, setHistory] = useState(post.history);
  const [decision, setDecision] = useState<
    "approve" | "changes" | "reject" | null
  >(null);

  const applyDecision = () => {
    if (!decision) return;
    const nextStatus: ApprovalStatus =
      decision === "approve"
        ? "approved"
        : decision === "changes"
          ? "changesRequested"
          : "rejected";
    const action: ApprovalHistoryEntry["action"] =
      decision === "approve"
        ? "approved"
        : decision === "reject"
          ? "rejected"
          : "changesRequested";
    setStatus(nextStatus);
    setHistory((current) => [
      ...current,
      {
        id: `decision-${Date.now()}`,
        actor: t("approvalReview.demoReviewer"),
        action,
        occurredAt: Date.now(),
        note: note.trim() || undefined,
      },
    ]);
    setDecision(null);
    setNote("");
  };

  return (
    <>
      <Link
        href="/growth/approvals"
        className="mb-5 inline-flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-[#173b9a]"
      >
        <ArrowLeft className="rtl:rotate-180" size={16} />{" "}
        {t("approvalReview.back")}
      </Link>
      <PrototypeNotices />

      <section className="glass-card mt-6 overflow-hidden rounded-3xl">
        <div className="h-1.5 bg-gradient-to-r from-[#173b9a] via-[#526ff2] to-[#a9ffe0]" />
        <div className="flex flex-wrap items-start justify-between gap-5 p-6 sm:p-8">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <ApprovalStatusPill status={status} />
              {post.priority === "high" && (
                <span className="rounded-full bg-rose-50 px-2.5 py-1 text-[0.68rem] font-bold text-rose-700">
                  {t("approvalReview.highPriority")}
                </span>
              )}
            </div>
            <h1 className="mt-4 text-3xl font-semibold tracking-[-0.04em] text-[#071e55]">
              {post.campaign}
            </h1>
            <p className="mt-2 text-sm text-slate-500">
              {t("approvalReview.by", { author: post.author })}
            </p>
          </div>
          <div className="text-start sm:text-end">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">
              {t("approvalReview.scheduledFor")}
            </p>
            <p className="mt-2 text-sm font-semibold text-[#071e55]">
              {post.scheduledAt
                ? format.dateTime(post.scheduledAt, {
                    dateStyle: "medium",
                    timeStyle: "short",
                  })
                : t("approvalReview.notScheduled")}
            </p>
            <div className="mt-3 sm:flex sm:justify-end">
              <ChannelPills channels={post.channels} />
            </div>
          </div>
        </div>
      </section>

      <section className="mt-6 grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <ApprovalPostPreview content={post.content} />

        <div className="space-y-6">
          <ApprovalWorkflow steps={post.steps} />

          <article className="glass-card rounded-3xl p-6">
            <h2 className="font-semibold text-[#071e55]">
              {t("approvalReview.decision")}
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              {t("approvalReview.decisionHint")}
            </p>
            <div className="mt-5 grid gap-2 sm:grid-cols-3">
              <button
                type="button"
                onClick={() => setDecision("approve")}
                className={`rounded-xl px-4 py-2.5 text-sm font-semibold ${decision === "approve" ? "bg-emerald-600 text-white" : "bg-emerald-50 text-emerald-700"}`}
              >
                {t("approvalReview.approve")}
              </button>
              <button
                type="button"
                onClick={() => setDecision("changes")}
                className={`rounded-xl px-4 py-2.5 text-sm font-semibold ${decision === "changes" ? "bg-amber-600 text-white" : "bg-amber-50 text-amber-700"}`}
              >
                {t("approvalReview.requestChanges")}
              </button>
              <button
                type="button"
                onClick={() => setDecision("reject")}
                className={`rounded-xl px-4 py-2.5 text-sm font-semibold ${decision === "reject" ? "bg-rose-600 text-white" : "bg-rose-50 text-rose-700"}`}
              >
                {t("approvalReview.reject")}
              </button>
            </div>
            {decision && (
              <div className="mt-4">
                <label className="text-sm font-semibold text-slate-700">
                  {t("approvalReview.note")}
                  <textarea
                    value={note}
                    onChange={(event) => setNote(event.target.value)}
                    placeholder={t("approvalReview.notePlaceholder")}
                    className="mt-2 min-h-24 w-full resize-y rounded-xl border border-slate-200 bg-white px-4 py-3 font-normal outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
                  />
                </label>
                <div className="mt-3 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setDecision(null);
                      setNote("");
                    }}
                    className="rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-500"
                  >
                    {t("approvalReview.cancel")}
                  </button>
                  <button
                    type="button"
                    onClick={applyDecision}
                    className="rounded-xl bg-[#173b9a] px-4 py-2.5 text-sm font-semibold text-white"
                  >
                    {t("approvalReview.confirm")}
                  </button>
                </div>
              </div>
            )}
            {status !== post.status && (
              <button
                type="button"
                onClick={() => {
                  setStatus(post.status);
                  setHistory(post.history);
                }}
                className="mt-4 inline-flex items-center gap-2 text-xs font-semibold text-slate-500"
              >
                <RotateCcw size={13} /> {t("approvalReview.resetDemo")}
              </button>
            )}
          </article>
        </div>
      </section>

      <ApprovalActivity history={history} />
    </>
  );
}
