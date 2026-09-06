"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import type { AnalyticsRow } from "./AnalyticsOverview";

export default function PostAnalytics({ rows }: { rows: AnalyticsRow[] }) {
  const t = useTranslations("analytics");

  return (
    <div className="overflow-x-auto">
      <div className="min-w-[820px]">
        <div className="grid grid-cols-[2fr_repeat(5,1fr)] border-b border-slate-100 pb-4 text-[0.62rem] font-bold uppercase tracking-[0.13em] text-slate-400">
          <span>{t("publishedPost")}</span>
          <span>{t("likes")}</span>
          <span>{t("comments")}</span>
          <span>{t("shares")}</span>
          <span>{t("reach")}</span>
          <span>{t("impressions")}</span>
        </div>
        {rows.map(({ post, analytics }) => (
          <Link
            key={post._id}
            href={`/posts/${post._id}`}
            className="grid grid-cols-[2fr_repeat(5,1fr)] py-4 text-sm text-slate-600 odd:bg-white/35 hover:bg-blue-50/50"
            title={t("refreshHint")}
          >
            <span className="truncate pe-5 font-semibold text-[#173b9a]">
              {post.content}
            </span>
            <span>{(analytics?.likes ?? 0).toLocaleString()}</span>
            <span>{(analytics?.comments ?? 0).toLocaleString()}</span>
            <span>{(analytics?.shares ?? 0).toLocaleString()}</span>
            <span>{analytics?.reach !== undefined ? analytics.reach.toLocaleString() : "—"}</span>
            <span>
              {analytics?.impressions !== undefined ? analytics.impressions.toLocaleString() : "—"}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
