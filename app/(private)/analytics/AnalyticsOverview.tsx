"use client";

import { useUser } from "@clerk/nextjs";
import {
  Heart,
  Loader2,
  MessageCircleMore,
  Share2,
  TrendingUp,
} from "lucide-react";
import { useQuery } from "convex/react";
import PageHeader from "@/components/hub/PageHeader";
import { api } from "@/convex/_generated/api";
import type { Doc } from "@/convex/_generated/dataModel";
import Chart from "./Chart";
import PostAnalytics from "./PostAnalytics";
import { useFormatter, useTranslations } from "next-intl";

export type AnalyticsRow = {
  post: Doc<"posts">;
  analytics: Pick<Doc<"analytics">, "likes" | "comments" | "shares"> | null;
};

export default function AnalyticsOverview() {
  const t = useTranslations("analytics");
  const { user, isLoaded } = useUser();
  const overview = useQuery(
    api.analytics.getOverview,
    user ? { userId: user.id } : "skip",
  );
  const posts = useQuery(
    api.analytics.getPostsWithAnalytics,
    user ? { userId: user.id, status: "Published" } : "skip",
  );

  return (
    <>
      <PageHeader
        eyebrow={t("eyebrow")}
        title={t("title")}
        description={t("description")}
      />

      {!isLoaded || (user && (overview === undefined || posts === undefined)) ? (
        <LoadingState />
      ) : !user ? (
        <MessageState
          title={t("unavailableTitle")}
          description={t("unavailableDescription")}
        />
      ) : !posts?.data.length ? (
        <MessageState
          title={t("emptyTitle")}
          description={t("emptyDescription")}
        />
      ) : (
        <AnalyticsContent rows={posts.data} overview={overview!} />
      )}
    </>
  );
}

function AnalyticsContent({
  rows,
  overview,
}: {
  rows: AnalyticsRow[];
  overview: {
    totalLikes: number;
    totalComments: number;
    totalShares: number;
    totalPosts: number;
  };
}) {
  const t = useTranslations("analytics");
  const common = useTranslations("common");
  const format = useFormatter();
  const metrics = [
    {
      label: t("likes"),
      value: overview.totalLikes,
      icon: Heart,
      color: "text-rose-600 bg-rose-50",
    },
    {
      label: t("comments"),
      value: overview.totalComments,
      icon: MessageCircleMore,
      color: "text-cyan-700 bg-cyan-50",
    },
    {
      label: t("shares"),
      value: overview.totalShares,
      icon: Share2,
      color: "text-violet-700 bg-violet-50",
    },
    {
      label: t("trackedPosts"),
      value: overview.totalPosts,
      icon: TrendingUp,
      color: "text-blue-700 bg-blue-50",
    },
  ];

  return (
    <>
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map(({ label, value, icon: Icon, color }) => (
          <article key={label} className="glass-card rounded-2xl p-5">
            <div className="flex items-center justify-between">
              <span
                className={`grid h-10 w-10 place-items-center rounded-xl ${color}`}
              >
                <Icon size={18} />
              </span>
              <p className="text-[0.62rem] font-bold uppercase tracking-[0.15em] text-slate-400">
                {common("total")}
              </p>
            </div>
            <p className="mt-5 text-3xl font-semibold tracking-[-0.04em]">
              {format.number(value)}
            </p>
            <p className="mt-1 text-sm text-slate-500">{label}</p>
          </article>
        ))}
      </section>
      <Chart rows={rows} />
      <PostAnalytics rows={rows} />
    </>
  );
}

function LoadingState() {
  const t = useTranslations("analytics");
  return (
    <div className="glass-card flex min-h-64 items-center justify-center rounded-3xl text-sm text-slate-500">
      <Loader2 size={18} className="mr-2 animate-spin" />
      {t("loading")}
    </div>
  );
}

function MessageState({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="glass-card flex min-h-64 flex-col items-center justify-center rounded-3xl px-6 text-center">
      <TrendingUp size={24} className="text-[#3556d9]" />
      <h2 className="mt-4 font-semibold text-[#071e55]">{title}</h2>
      <p className="mt-2 max-w-md text-sm leading-6 text-slate-500">
        {description}
      </p>
    </div>
  );
}
