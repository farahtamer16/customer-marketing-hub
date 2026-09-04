"use client";

import { useMemo, useState } from "react";
import { useFormatter, useTranslations } from "next-intl";

type MetricKey = "reach" | "impressions" | "engagement";
const METRICS: MetricKey[] = ["reach", "impressions", "engagement"];

interface Snapshot {
  scrapedAt: number;
  reach?: number;
  impressions?: number;
  likes: number;
  comments: number;
  shares?: number;
}

// Every analytics refresh already inserts a new row (recordAnalytics) — this
// is the first place that history is actually shown instead of discarded in
// favor of just the latest snapshot.
export default function AnalyticsTrendChart({ history }: { history: Snapshot[] }) {
  const t = useTranslations("analytics");
  const format = useFormatter();
  const [metric, setMetric] = useState<MetricKey>("reach");

  const series = useMemo(() => {
    return history
      .map((entry) => ({
        x: entry.scrapedAt,
        y:
          metric === "reach"
            ? entry.reach
            : metric === "impressions"
              ? entry.impressions
              : entry.likes + entry.comments + (entry.shares ?? 0),
      }))
      .filter((point): point is { x: number; y: number } => point.y !== undefined);
  }, [history, metric]);

  const header = (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div>
        <h2 className="font-semibold text-[#071e55]">{t("trendTitle")}</h2>
        <p className="mt-1 text-xs text-slate-500">{t("trendHint")}</p>
      </div>
      <div className="flex rounded-xl bg-slate-100 p-1">
        {METRICS.map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => setMetric(key)}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${
              metric === key ? "bg-white text-[#173b9a] shadow-sm" : "text-slate-500"
            }`}
          >
            {t(`trendMetric.${key}`)}
          </button>
        ))}
      </div>
    </div>
  );

  if (series.length < 2) {
    return (
      <article className="glass-card rounded-3xl p-6">
        {header}
        <p className="mt-6 text-sm text-slate-400">{t("trendNoData")}</p>
      </article>
    );
  }

  const minX = series[0].x;
  const maxX = series[series.length - 1].x;
  const minY = Math.min(...series.map((p) => p.y));
  const maxY = Math.max(...series.map((p) => p.y));
  const spanX = maxX - minX || 1;
  const spanY = maxY - minY || 1;

  const plotted = series.map((p) => ({
    px: ((p.x - minX) / spanX) * 280 + 10,
    py: 90 - ((p.y - minY) / spanY) * 80,
    value: p.y,
  }));

  return (
    <article className="glass-card rounded-3xl p-6">
      {header}
      <svg viewBox="0 0 300 100" className="mt-4 h-32 w-full" preserveAspectRatio="none">
        <polyline
          points={plotted.map((p) => `${p.px},${p.py}`).join(" ")}
          fill="none"
          stroke="#3156dc"
          strokeWidth="2"
        />
        {plotted.map((p, index) => (
          <circle key={index} cx={p.px} cy={p.py} r="2.5" fill="#173b9a" />
        ))}
      </svg>
      <div className="mt-2 flex justify-between text-[0.65rem] text-slate-400">
        <span>{format.dateTime(minX, { dateStyle: "short" })}</span>
        <span>{format.dateTime(maxX, { dateStyle: "short" })}</span>
      </div>
    </article>
  );
}
