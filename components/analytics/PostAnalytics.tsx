"use client";

import {
  BarChart3,
  Clock3,
  Eye,
  Heart,
  Loader2,
  MessageCircleMore,
  RefreshCw,
  Share2,
  Sparkles,
  TrendingUp,
  TriangleAlert,
  Users,
} from "lucide-react";
import type { Id } from "@/convex/_generated/dataModel";
import { usePostAnalytics } from "@/hooks/usePostAnalytics";
import { PostComments } from "./PostComments";
import { useFormatter, useTranslations } from "next-intl";

interface PostAnalyticsProps {
  postId: Id<"posts">;
  userId: string;
}

export function PostAnalytics({ postId, userId }: PostAnalyticsProps) {
  const t = useTranslations("analytics");
  const formatter = useFormatter();
  const {
    analytics,
    isInitialLoading,
    refreshing,
    error,
    cached,
    refresh,
    canRefresh,
    cooldownRemaining,
  } = usePostAnalytics(postId, userId);

  if (isInitialLoading) {
    return (
      <div className="glass-card flex min-h-72 items-center justify-center rounded-3xl text-sm text-slate-500">
        <Loader2 className="me-2 animate-spin" size={18} />
        {t("loadingLatest")}
      </div>
    );
  }

  const engagementRate =
    analytics?.reach && analytics.reach > 0
      ? (analytics.likes + analytics.comments + (analytics.shares ?? 0)) /
        analytics.reach
      : null;

  const metrics = analytics
    ? [
        {
          label: t("likes"),
          value: formatter.number(analytics.likes),
          icon: Heart,
          tone: "bg-rose-50 text-rose-600",
        },
        {
          label: t("comments"),
          value: formatter.number(analytics.comments),
          icon: MessageCircleMore,
          tone: "bg-cyan-50 text-cyan-700",
        },
        {
          label: t("shares"),
          value: formatter.number(analytics.shares ?? 0),
          icon: Share2,
          tone: "bg-violet-50 text-violet-700",
        },
        {
          label: t("reach"),
          value:
            analytics.reach !== undefined
              ? formatter.number(analytics.reach)
              : t("notAvailable"),
          icon: Users,
          tone: "bg-emerald-50 text-emerald-700",
        },
        {
          label: t("impressions"),
          value:
            analytics.impressions !== undefined
              ? formatter.number(analytics.impressions)
              : t("notAvailable"),
          icon: Eye,
          tone: "bg-amber-50 text-amber-700",
        },
        {
          label: t("engagementRate"),
          value:
            engagementRate !== null
              ? formatter.number(engagementRate, { style: "percent", maximumFractionDigits: 1 })
              : t("notAvailable"),
          icon: TrendingUp,
          tone: "bg-blue-50 text-blue-700",
        },
      ]
    : [];

  return (
    <div className="space-y-6">
      {/* ── Hero section ── */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#102f7e] via-[#3156dc] to-[#7186ff] p-6 text-white shadow-2xl shadow-blue-900/20 sm:p-8">
        <div className="pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full border border-white/15 shadow-[0_0_0_40px_rgba(255,255,255,0.05),0_0_0_80px_rgba(196,255,230,0.05)]" />
        <div className="relative flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="flex items-center gap-2 text-[0.68rem] font-bold uppercase tracking-[0.18em] text-[#c4ffe6]">
              <Sparkles size={14} /> {t("liveInsights")}
            </div>
            <h1 className="mt-3 text-3xl font-semibold tracking-[-0.04em]">
              {t("postTitle")}
            </h1>
            <p className="mt-2 max-w-xl text-sm leading-6 text-blue-100">
              {t("detailDescription")}
            </p>
          </div>
          <button
            type="button"
            onClick={refresh}
            disabled={!canRefresh}
            className="inline-flex min-w-44 items-center justify-center gap-2 rounded-2xl bg-white px-5 py-3 text-sm font-semibold text-[#173b9a] shadow-lg transition hover:-translate-y-0.5 hover:shadow-xl disabled:cursor-not-allowed disabled:translate-y-0 disabled:bg-white/70 disabled:text-slate-500 disabled:shadow-none"
          >
            <RefreshCw size={16} className={refreshing ? "animate-spin" : ""} />
            {refreshing
              ? t("refreshing")
              : cooldownRemaining > 0
                ? cooldownRemaining >= 60 * 60 * 1000
                  ? t("cooldownHour")
                  : t("cooldownMinutes", {
                      count: Math.max(1, Math.ceil(cooldownRemaining / 60_000)),
                    })
                : t("refresh")}
          </button>
        </div>
      </section>

      {error && (
        <div className="flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          <TriangleAlert className="mt-0.5 flex-none" size={17} />
          <span>{error}</span>
        </div>
      )}

      {!analytics ? (
        <section className="glass-card flex min-h-64 flex-col items-center justify-center rounded-3xl px-6 text-center">
          <span className="grid h-12 w-12 place-items-center rounded-2xl bg-blue-50 text-[#3556d9]">
            <BarChart3 size={23} />
          </span>
          <h2 className="mt-4 font-semibold text-[#071e55]">
            {t("noDataTitle")}
          </h2>
          <p className="mt-2 max-w-md text-sm leading-6 text-slate-500">
            {t("noDataDescription")}
          </p>
        </section>
      ) : (
        <>
          <section className="grid gap-4 sm:grid-cols-3">
            {metrics.map(({ label, value, icon: Icon, tone }) => (
              <article key={label} className="glass-card rounded-2xl p-5">
                <span
                  className={`grid h-10 w-10 place-items-center rounded-xl ${tone}`}
                >
                  <Icon size={18} />
                </span>
                <p className="mt-5 text-3xl font-semibold tracking-[-0.04em] text-[#071e55]">
                  {value}
                </p>
                <p className="mt-1 text-sm text-slate-500">{label}</p>
              </article>
            ))}
          </section>

          <div className="glass-card flex flex-wrap items-center justify-between gap-3 rounded-2xl px-5 py-4 text-xs text-slate-500">
            <span className="inline-flex items-center gap-2">
              <Clock3 size={15} className="text-[#3556d9]" />
              {t("lastCollected", {
                date: formatter.dateTime(analytics.scrapedAt, {
                  dateStyle: "medium",
                  timeStyle: "short",
                }),
              })}
            </span>
            {cached && (
              <span className="rounded-full bg-slate-100 px-3 py-1 font-semibold text-slate-500">
                {t("cachedResponse")}
              </span>
            )}
          </div>
        </>
      )}

      <PostComments postId={postId} userId={userId} />
    </div>
  );
}
