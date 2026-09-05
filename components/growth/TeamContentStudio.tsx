"use client";

import { useState } from "react";
import Link from "next/link";
import { useMutation, useQuery } from "convex/react";
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Eye,
  Heart,
  MessageCircleMore,
  Plus,
  RotateCcw,
  Share2,
  Trash2,
  TrendingUp,
  Users,
  XCircle,
} from "lucide-react";
import { useFormatter, useLocale, useTranslations } from "next-intl";
import { toast } from "sonner";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { navIcons } from "@/lib/nav-icons";
import { DemoModeBanner } from "./GrowthPrimitives";

const TABS = ["posts", "calendar", "comments", "analytics"] as const;
export type StudioTab = (typeof TABS)[number];

export default function TeamContentStudio({
  teamId,
  tab,
}: {
  // null = the whole workspace, no team filter — Content Studio's default.
  teamId: Id<"teams"> | null;
  tab: StudioTab;
}) {
  const t = useTranslations("growth.contentStudio");
  const teams = useQuery(api.teams.listTeamNames) ?? [];
  const team = teamId ? teams.find((entry) => entry.id === teamId) : null;
  const routeSegment = teamId ?? "workspace";

  return (
    <div className="space-y-6">
      <Link
        href="/growth/team"
        className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-[#173b9a]"
      >
        <ArrowLeft className="rtl:rotate-180" size={16} />
        {t("back")}
      </Link>
      <DemoModeBanner />

      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">
          {t("eyebrow")}
        </p>
        <h1 className="mt-1 text-2xl font-semibold tracking-[-0.03em] text-[#071e55]">
          {teamId ? (team ? team.name : t("loadingTeam")) : t("wholeWorkspace")}
        </h1>
      </div>

      <nav className="flex flex-wrap gap-2" aria-label={t("tabs")}>
        {TABS.map((value) => {
          const Icon = navIcons[value === "calendar" ? "calendar" : value];
          const active = value === tab;
          return (
            <Link
              key={value}
              href={`/growth/studio/${routeSegment}/${value}`}
              className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold ${active ? "bg-[#173b9a] text-white shadow-lg shadow-blue-900/15" : "bg-white/70 text-slate-600 hover:bg-white"}`}
            >
              <Icon size={16} />
              {t(`tabLabels.${value}`)}
            </Link>
          );
        })}
      </nav>

      {tab === "posts" && <PostsTab teamId={teamId} />}
      {tab === "calendar" && <CalendarTab teamId={teamId} />}
      {tab === "comments" && <CommentsTab teamId={teamId} />}
      {tab === "analytics" && <AnalyticsTab teamId={teamId} />}
    </div>
  );
}

function PostsTab({ teamId }: { teamId: Id<"teams"> | null }) {
  const t = useTranslations("growth.contentStudio");
  const posts = useQuery(api.analytics.getPostsWithAnalyticsForTeamAdmin, { teamId: teamId ?? undefined });
  const cancelPost = useMutation(api.posts.cancelScheduledItemAdmin);
  const retryPost = useMutation(api.posts.retryPostAdmin);
  const deletePost = useMutation(api.posts.deletePostAdmin);

  const run = async (action: () => Promise<unknown>, success: string) => {
    try {
      await action();
      toast.success(success);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("actionFailed"));
    }
  };

  return (
    <section className="glass-card overflow-hidden rounded-3xl">
      <div className="flex items-center justify-end border-b border-slate-100 px-6 py-4">
        <Link
          href="/create/post"
          title={t("schedulePostHint")}
          className="inline-flex items-center gap-2 rounded-xl bg-[#173b9a] px-4 py-2.5 text-sm font-semibold text-white"
        >
          <Plus size={16} />
          {t("schedulePost")}
        </Link>
      </div>
      {!posts ? (
        <p className="px-6 py-8 text-center text-sm text-slate-500">{t("loading")}</p>
      ) : posts.data.length === 0 ? (
        <p className="px-6 py-8 text-center text-sm text-slate-500">{t("postsEmpty")}</p>
      ) : (
        <div className="overflow-x-auto">
          <div className="min-w-[960px]">
            <div className="grid grid-cols-[2fr_1fr_1fr_repeat(5,1fr)_auto] items-center border-b border-slate-100 px-6 py-4 text-[0.62rem] font-bold uppercase tracking-[0.13em] text-slate-400">
              <span>{t("postColumn")}</span>
              <span>{t("platform")}</span>
              <span>{t("status")}</span>
              <span>{t("likes")}</span>
              <span>{t("comments")}</span>
              <span>{t("shares")}</span>
              <span>{t("reach")}</span>
              <span>{t("impressions")}</span>
              <span />
            </div>
            {posts.data.map(({ post, analytics }) => (
              <div
                key={post._id}
                className="grid grid-cols-[2fr_1fr_1fr_repeat(5,1fr)_auto] items-center px-6 py-4 text-sm text-slate-600 odd:bg-white/35"
              >
                <span className="truncate pr-5 font-semibold text-[#173b9a]">{post.content}</span>
                <span className="text-xs text-slate-400">{post.platform}</span>
                <span className="text-xs text-slate-400">{post.status}</span>
                <span>{(analytics?.likes ?? 0).toLocaleString()}</span>
                <span>{(analytics?.comments ?? 0).toLocaleString()}</span>
                <span>{(analytics?.shares ?? 0).toLocaleString()}</span>
                <span>{analytics?.reach !== undefined ? analytics.reach.toLocaleString() : "—"}</span>
                <span>{analytics?.impressions !== undefined ? analytics.impressions.toLocaleString() : "—"}</span>
                <span className="flex items-center gap-1 justify-self-end">
                  {post.status === "Scheduled" && (
                    <button
                      type="button"
                      title={t("cancelPost")}
                      onClick={() => run(() => cancelPost({ postId: post._id }), t("cancelled"))}
                      className="rounded-lg p-1.5 text-amber-600 hover:bg-amber-50"
                    >
                      <XCircle size={15} />
                    </button>
                  )}
                  {post.status === "Failed" && (
                    <button
                      type="button"
                      title={t("retryPost")}
                      onClick={() => run(() => retryPost({ postId: post._id }), t("willRetry"))}
                      className="rounded-lg p-1.5 text-blue-600 hover:bg-blue-50"
                    >
                      <RotateCcw size={15} />
                    </button>
                  )}
                  <button
                    type="button"
                    title={t("deletePost")}
                    onClick={() => {
                      if (!window.confirm(t("deletePostConfirm"))) return;
                      run(() => deletePost({ postId: post._id }), t("deleted"));
                    }}
                    className="rounded-lg p-1.5 text-rose-500 hover:bg-rose-50"
                  >
                    <Trash2 size={15} />
                  </button>
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

function CommentsTab({ teamId }: { teamId: Id<"teams"> | null }) {
  const t = useTranslations("growth.contentStudio");
  const comments = useQuery(api.comments.getCommentsForTeamAdmin, { teamId: teamId ?? undefined });
  const deleteComment = useMutation(api.comments.deleteCommentAdmin);

  return (
    <section className="glass-card overflow-hidden rounded-3xl">
      {!comments ? (
        <p className="px-6 py-8 text-center text-sm text-slate-500">{t("loading")}</p>
      ) : comments.length === 0 ? (
        <p className="px-6 py-8 text-center text-sm text-slate-500">{t("commentsEmpty")}</p>
      ) : (
        <div className="divide-y divide-slate-100">
          {comments.slice(0, 50).map((comment) => (
            <div key={comment._id} className="flex flex-wrap items-center justify-between gap-3 px-6 py-4">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-[#071e55]">{comment.authorName}</p>
                <p className="mt-0.5 truncate text-xs text-slate-500">{comment.content}</p>
              </div>
              <span className="shrink-0 rounded-full bg-slate-50 px-2.5 py-1 text-[0.62rem] font-bold uppercase tracking-[0.1em] text-slate-500">
                {comment.classification}
              </span>
              <button
                type="button"
                title={t("deleteComment")}
                onClick={async () => {
                  if (!window.confirm(t("deleteCommentConfirm"))) return;
                  try {
                    await deleteComment({ commentId: comment._id });
                    toast.success(t("deleted"));
                  } catch (error) {
                    toast.error(error instanceof Error ? error.message : t("actionFailed"));
                  }
                }}
                className="shrink-0 rounded-lg p-1.5 text-rose-500 hover:bg-rose-50"
              >
                <Trash2 size={15} />
              </button>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function AnalyticsTab({ teamId }: { teamId: Id<"teams"> | null }) {
  const t = useTranslations("growth.contentStudio");
  const format = useFormatter();
  const overview = useQuery(api.analytics.getOverviewForTeamAdmin, { teamId: teamId ?? undefined });

  if (!overview) {
    return (
      <section className="glass-card rounded-3xl p-6">
        <p className="text-center text-sm text-slate-500">{t("loading")}</p>
      </section>
    );
  }

  const metrics = [
    { label: t("likes"), value: format.number(overview.totalLikes), icon: Heart, color: "text-rose-600 bg-rose-50" },
    { label: t("comments"), value: format.number(overview.totalComments), icon: MessageCircleMore, color: "text-cyan-700 bg-cyan-50" },
    { label: t("shares"), value: format.number(overview.totalShares), icon: Share2, color: "text-violet-700 bg-violet-50" },
    { label: t("reach"), value: overview.totalReach ? format.number(overview.totalReach) : t("notAvailable"), icon: Users, color: "text-emerald-700 bg-emerald-50" },
    { label: t("impressions"), value: overview.totalImpressions ? format.number(overview.totalImpressions) : t("notAvailable"), icon: Eye, color: "text-amber-700 bg-amber-50" },
    {
      label: t("engagementRate"),
      value:
        overview.avgEngagementRate !== null
          ? format.number(overview.avgEngagementRate, { style: "percent", maximumFractionDigits: 1 })
          : t("notAvailable"),
      icon: TrendingUp,
      color: "text-blue-700 bg-blue-50",
    },
  ];

  return (
    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {metrics.map(({ label, value, icon: Icon, color }) => (
        <article key={label} className="glass-card rounded-2xl p-5">
          <span className={`grid h-10 w-10 place-items-center rounded-xl ${color}`}>
            <Icon size={18} />
          </span>
          <p className="mt-5 text-3xl font-semibold tracking-[-0.04em]">{value}</p>
          <p className="mt-1 text-sm text-slate-500">{label}</p>
        </article>
      ))}
    </section>
  );
}

function CalendarTab({ teamId }: { teamId: Id<"teams"> | null }) {
  const t = useTranslations("growth.contentStudio");
  const formatter = useFormatter();
  const locale = useLocale();
  const posts = useQuery(api.posts.getPostsForTeamAdmin, { teamId: teamId ?? undefined });
  const [visibleMonth, setVisibleMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });

  if (!posts) {
    return (
      <section className="glass-card rounded-3xl p-6">
        <p className="text-center text-sm text-slate-500">{t("loading")}</p>
      </section>
    );
  }

  const year = visibleMonth.getFullYear();
  const month = visibleMonth.getMonth();
  const firstWeekday = new Date(year, month, 1).getDay();
  const numberOfDays = new Date(year, month + 1, 0).getDate();
  const cells = [
    ...Array(firstWeekday).fill(null),
    ...Array.from({ length: numberOfDays }, (_, index) => index + 1),
  ];
  const datedPosts = posts.filter(
    (post) => post.scheduledAt && (post.status === "Scheduled" || post.status === "Published"),
  );
  const weekDays = Array.from({ length: 7 }, (_, day) =>
    formatter.dateTime(new Date(2024, 0, 7 + day), { weekday: "short" }),
  );

  function moveMonth(offset: number) {
    setVisibleMonth(new Date(year, month + offset, 1));
  }

  return (
    <section className="glass-card overflow-hidden rounded-3xl">
      <header className="flex items-center justify-between border-b border-slate-100 px-5 py-5 sm:px-7">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.15em] text-[#3556d9]">
            {formatter.dateTime(visibleMonth, { month: "long" })}
          </p>
          <h2 className="mt-1 text-xl font-semibold">
            {formatter.number(year, { useGrouping: false })}
          </h2>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/create/post"
            title={t("schedulePostHint")}
            className="inline-flex items-center gap-2 rounded-xl bg-[#173b9a] px-4 py-2.5 text-sm font-semibold text-white"
          >
            <Plus size={16} />
            {t("schedulePost")}
          </Link>
          <button
            type="button"
            aria-label={t("previousMonth")}
            onClick={() => moveMonth(-1)}
            className="grid h-9 w-9 place-items-center rounded-full border border-slate-200 bg-white text-slate-500 hover:text-[#173b9a]"
          >
            {locale === "ar" ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          </button>
          <button
            type="button"
            aria-label={t("nextMonth")}
            onClick={() => moveMonth(1)}
            className="grid h-9 w-9 place-items-center rounded-full border border-slate-200 bg-white text-slate-500 hover:text-[#173b9a]"
          >
            {locale === "ar" ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
          </button>
        </div>
      </header>
      <div className="grid grid-cols-7 border-b border-slate-100 bg-white/45 text-center text-[0.62rem] font-bold uppercase tracking-[0.12em] text-slate-400">
        {weekDays.map((day) => (
          <div key={day} className="py-3">
            {day}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 soft-grid">
        {cells.map((day, index) => {
          if (day === null)
            return (
              <div
                key={`blank-${index}`}
                className="min-h-24 border-b border-e border-blue-900/5 bg-white/20 sm:min-h-32"
              />
            );
          const dayPosts = datedPosts.filter((post) => {
            const date = new Date(post.scheduledAt!);
            return (
              date.getFullYear() === year &&
              date.getMonth() === month &&
              date.getDate() === day
            );
          });
          return (
            <div key={day} className="min-h-24 border-b border-e border-blue-900/5 p-2 sm:min-h-32 sm:p-3">
              <span className="grid h-7 w-7 place-items-center rounded-full text-xs font-semibold text-slate-500">
                {formatter.number(day, { useGrouping: false })}
              </span>
              <div className="mt-2 space-y-1.5">
                {dayPosts.map((post) => (
                  <article
                    key={post._id}
                    className={`rounded-lg border px-2 py-1.5 text-[0.62rem] leading-4 ${post.status === "Published" ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-blue-200 bg-blue-50 text-blue-800"}`}
                  >
                    <p className="font-bold">{post.platform}</p>
                    <p className="hidden truncate sm:block">{post.content}</p>
                  </article>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
