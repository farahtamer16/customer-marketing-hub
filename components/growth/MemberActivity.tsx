"use client";

import Link from "next/link";
import { useQuery } from "convex/react";
import {
  ArrowLeft,
  Eye,
  Heart,
  MessageCircleMore,
  Share2,
  TrendingUp,
  Users,
} from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { DemoModeBanner } from "./GrowthPrimitives";
import { MemberAvatar, MemberStatusPill, WorkspaceRolePill } from "./TeamPrimitives";

export default function MemberActivity({ memberId }: { memberId: Id<"teamMembers"> }) {
  const t = useTranslations("growth.memberActivity");
  const growth = useTranslations("growth");
  const format = useFormatter();

  const member = useQuery(api.team.getMemberDetail, { memberId });
  const clerkUserId = member?.clerkUserId ?? undefined;

  const overview = useQuery(
    api.analytics.getOverviewAdmin,
    clerkUserId ? { userId: clerkUserId } : "skip",
  );
  const posts = useQuery(
    api.analytics.getPostsWithAnalyticsAdmin,
    clerkUserId ? { userId: clerkUserId } : "skip",
  );
  const comments = useQuery(
    api.comments.getCommentsForUserAdmin,
    clerkUserId ? { userId: clerkUserId } : "skip",
  );

  if (member === undefined) return null;

  if (member === null) {
    return (
      <div className="glass-card flex min-h-64 flex-col items-center justify-center rounded-3xl px-6 text-center">
        <h2 className="font-semibold text-[#071e55]">{t("notFound")}</h2>
      </div>
    );
  }

  const metrics = overview
    ? [
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
      ]
    : [];

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

      <section className="glass-card overflow-hidden rounded-3xl">
        <div className="h-1.5 bg-gradient-to-r from-[#173b9a] via-[#526ff2] to-[#a9ffe0]" />
        <div className="flex flex-wrap items-center justify-between gap-5 p-6 sm:p-8">
          <div className="flex items-center gap-4">
            <MemberAvatar name={member.name} />
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-semibold tracking-[-0.04em] text-[#071e55]">
                  {member.name}
                </h1>
                <WorkspaceRolePill role={member.role} />
                <MemberStatusPill status={member.status} />
              </div>
              <p className="mt-1 text-sm text-slate-500">{member.email}</p>
            </div>
          </div>
          <div className="text-start sm:text-end">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">
              {growth("team.lastActive")}
            </p>
            <p className="mt-1 text-sm font-semibold text-[#071e55]">
              {member.lastActive
                ? format.dateTime(member.lastActive, { dateStyle: "medium", timeStyle: "short" })
                : growth("team.awaitingAcceptance")}
            </p>
          </div>
        </div>
      </section>

      {!clerkUserId ? (
        <div className="glass-card flex min-h-40 flex-col items-center justify-center rounded-3xl px-6 text-center">
          <p className="text-sm text-slate-500">{t("notLinked")}</p>
        </div>
      ) : (
        <>
          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {metrics.map(({ label, value, icon: Icon, color }) => (
              <article key={label} className="glass-card rounded-2xl p-5">
                <div className="flex items-center justify-between">
                  <span className={`grid h-10 w-10 place-items-center rounded-xl ${color}`}>
                    <Icon size={18} />
                  </span>
                </div>
                <p className="mt-5 text-3xl font-semibold tracking-[-0.04em]">{value}</p>
                <p className="mt-1 text-sm text-slate-500">{label}</p>
              </article>
            ))}
          </section>

          <section className="glass-card mt-6 overflow-hidden rounded-3xl">
            <div className="border-b border-slate-100 px-6 py-5">
              <h2 className="font-semibold text-[#071e55]">{t("postsTitle")}</h2>
              <p className="mt-1 text-xs text-slate-500">{t("postsHint")}</p>
            </div>
            {!posts?.data.length ? (
              <p className="px-6 py-8 text-center text-sm text-slate-500">{t("postsEmpty")}</p>
            ) : (
              <div className="overflow-x-auto">
                <div className="min-w-[820px]">
                  <div className="grid grid-cols-[2fr_repeat(5,1fr)] border-b border-slate-100 px-6 py-4 text-[0.62rem] font-bold uppercase tracking-[0.13em] text-slate-400">
                    <span>{t("postColumn")}</span>
                    <span>{t("likes")}</span>
                    <span>{t("comments")}</span>
                    <span>{t("shares")}</span>
                    <span>{t("reach")}</span>
                    <span>{t("impressions")}</span>
                  </div>
                  {posts.data.map(({ post, analytics }) => (
                    <div
                      key={post._id}
                      className="grid grid-cols-[2fr_repeat(5,1fr)] px-6 py-4 text-sm text-slate-600 odd:bg-white/35"
                    >
                      <span className="truncate pr-5 font-semibold text-[#173b9a]">{post.content}</span>
                      <span>{(analytics?.likes ?? 0).toLocaleString()}</span>
                      <span>{(analytics?.comments ?? 0).toLocaleString()}</span>
                      <span>{(analytics?.shares ?? 0).toLocaleString()}</span>
                      <span>{analytics?.reach !== undefined ? analytics.reach.toLocaleString() : "—"}</span>
                      <span>{analytics?.impressions !== undefined ? analytics.impressions.toLocaleString() : "—"}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>

          <section className="glass-card mt-6 overflow-hidden rounded-3xl">
            <div className="border-b border-slate-100 px-6 py-5">
              <h2 className="font-semibold text-[#071e55]">{t("commentsTitle")}</h2>
              <p className="mt-1 text-xs text-slate-500">{t("commentsHint")}</p>
            </div>
            {!comments?.length ? (
              <p className="px-6 py-8 text-center text-sm text-slate-500">{t("commentsEmpty")}</p>
            ) : (
              <div className="divide-y divide-slate-100">
                {comments
                  .slice()
                  .sort((a, b) => b.createdAt - a.createdAt)
                  .slice(0, 20)
                  .map((comment) => (
                    <div key={comment._id} className="flex flex-wrap items-center justify-between gap-3 px-6 py-4">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-[#071e55]">{comment.authorName}</p>
                        <p className="mt-0.5 truncate text-xs text-slate-500">{comment.content}</p>
                      </div>
                      <span className="shrink-0 rounded-full bg-slate-50 px-2.5 py-1 text-[0.62rem] font-bold uppercase tracking-[0.1em] text-slate-500">
                        {comment.classification}
                      </span>
                    </div>
                  ))}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
