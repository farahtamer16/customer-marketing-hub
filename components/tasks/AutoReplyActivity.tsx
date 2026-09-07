"use client";

import Link from "next/link";
import { useQuery } from "convex/react";
import { useTranslations } from "next-intl";
import { api } from "@/convex/_generated/api";

export default function AutoReplyActivity() {
  const t = useTranslations("tasks");
  const activity = useQuery(api.comments.listAutoReplyActivity);

  if (!activity || activity.length === 0) return null;

  return (
    <section className="glass-card mb-6 rounded-3xl p-5 sm:p-6">
      <h2 className="font-semibold text-[#071e55]">{t("autoReplyActivityTitle")}</h2>
      <p className="mt-1 text-xs text-slate-500">
        {t("autoReplyActivityHint", { count: activity.length })}
      </p>
      <div className="mt-4 space-y-2">
        {activity.map((entry) => (
          <div
            key={entry._id}
            className="flex items-start gap-3 rounded-xl bg-white/60 px-4 py-3"
          >
            <span
              className={`mt-0.5 shrink-0 rounded-full px-2 py-0.5 text-[0.6rem] font-bold ${
                entry.autoReply.status === "sent"
                  ? "bg-emerald-50 text-emerald-700"
                  : "bg-rose-50 text-rose-700"
              }`}
            >
              {entry.autoReply.status === "sent" ? t("autoReplySent") : t("autoReplyFailedLabel")}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm text-slate-600" title={entry.content}>
                {entry.content}
              </p>
              {entry.autoReply.status === "sent" ? (
                <p className="mt-1 truncate text-xs text-emerald-700" title={entry.autoReply.text}>
                  {entry.autoReply.text}
                </p>
              ) : (
                <p className="mt-1 truncate text-xs text-rose-600" title={entry.autoReply.error}>
                  {entry.autoReply.error}
                </p>
              )}
            </div>
            {entry.postId && (
              <Link
                href={`/posts/${entry.postId}`}
                className="shrink-0 text-xs font-semibold text-[#2854dc] hover:underline"
              >
                {t("autoReplyViewPost")}
              </Link>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
