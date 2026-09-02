"use client";

import { useEffect, useState } from "react";
import { useAction, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Doc, Id } from "@/convex/_generated/dataModel";
import { useTranslations } from "next-intl";

// The Graph API is cheap to call, unlike the old scraping-based backend
// this cooldown was originally sized for — just guard against accidental
// button-mashing, not real rate limiting.
const REFRESH_COOLDOWN_MS = 2 * 60 * 1000;

const cooldownKey = (postId: Id<"posts">) =>
  `spiders-ai:analytics-refresh:${postId}`;

type AnalyticsSnapshot = Pick<
  Doc<"analytics">,
  "likes" | "comments" | "shares" | "reach" | "impressions" | "scrapedAt"
>;

export function usePostAnalytics(postId: Id<"posts">, userId: string) {
  const t = useTranslations("analytics");
  const fetchPostAnalytics = useAction(api.meta.fetchPostAnalytics);
  const storedAnalytics = useQuery(api.analytics.getLatestForPost, { postId });
  const [refreshedAnalytics, setRefreshedAnalytics] =
    useState<AnalyticsSnapshot | null>(null);
  const analytics =
    refreshedAnalytics &&
    (!storedAnalytics ||
      refreshedAnalytics.scrapedAt >= storedAnalytics.scrapedAt)
      ? refreshedAnalytics
      : storedAnalytics;
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cached, setCached] = useState(false);
  const [nextRefreshAt, setNextRefreshAt] = useState(0);
  const [cooldownLoaded, setCooldownLoaded] = useState(false);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      const stored = Number(localStorage.getItem(cooldownKey(postId)) ?? 0);
      setRefreshedAnalytics(null);
      setNextRefreshAt(Number.isFinite(stored) ? stored : 0);
      setCooldownLoaded(true);
    });
    return () => cancelAnimationFrame(frame);
  }, [postId]);

  const analyticsNextRefreshAt = analytics
    ? analytics.scrapedAt + REFRESH_COOLDOWN_MS
    : 0;
  const effectiveNextRefreshAt = Math.max(
    nextRefreshAt,
    analyticsNextRefreshAt,
  );

  useEffect(() => {
    if (effectiveNextRefreshAt <= now) return;
    const interval = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(interval);
  }, [effectiveNextRefreshAt, now]);

  const cooldownRemaining = Math.max(0, effectiveNextRefreshAt - now);
  const canRefresh = cooldownLoaded && !refreshing && cooldownRemaining === 0;

  const refresh = async () => {
    if (!postId || !userId || !canRefresh) return;

    setRefreshing(true);
    setError(null);
    try {
      const result = await fetchPostAnalytics({ postId });
      const snapshot: AnalyticsSnapshot = {
        likes: result.likes,
        comments: result.comments,
        shares: result.shares,
        reach: result.reach,
        impressions: result.impressions,
        scrapedAt: Date.now(),
      };
      setRefreshedAnalytics(snapshot);

      const nextAllowedAt = Date.now() + REFRESH_COOLDOWN_MS;
      localStorage.setItem(cooldownKey(postId), String(nextAllowedAt));
      setNextRefreshAt(nextAllowedAt);
      setNow(Date.now());
      setCached(false);
    } catch (refreshError) {
      setError(
        refreshError instanceof Error
          ? refreshError.message
          : t("refreshFailed"),
      );
    } finally {
      setRefreshing(false);
    }
  };

  return {
    analytics: analytics ?? null,
    isInitialLoading: analytics === undefined,
    refreshing,
    error,
    cached,
    refresh,
    canRefresh,
    cooldownRemaining,
  };
}
