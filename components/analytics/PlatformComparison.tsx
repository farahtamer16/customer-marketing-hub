"use client";

import { useQuery } from "convex/react";
import { Layers } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import { api } from "@/convex/_generated/api";

export default function PlatformComparison() {
  const t = useTranslations("analytics.platformComparison");
  const tCommon = useTranslations("analytics");
  const format = useFormatter();
  const rows = useQuery(api.analytics.getPlatformComparison);

  const maxRate = Math.max(1, ...(rows ?? []).map((row) => row.avgEngagementRate ?? 0));

  return (
    <article className="glass-card rounded-3xl p-6">
      <div className="flex items-center gap-3">
        <span className="grid h-10 w-10 place-items-center rounded-xl bg-violet-50 text-violet-700">
          <Layers size={18} />
        </span>
        <div>
          <h2 className="font-semibold text-[#071e55]">{t("title")}</h2>
          <p className="mt-0.5 text-xs text-slate-500">{t("hint")}</p>
        </div>
      </div>

      {rows === undefined ? null : rows.length === 0 ? (
        <p className="mt-5 text-sm text-slate-400">{t("empty")}</p>
      ) : (
        <div className="mt-5 space-y-4">
          {rows.map((row) => (
            <div key={row.platform}>
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-700">{row.platform}</span>
                <span className="text-slate-500">{t("postsCount", { count: row.posts })}</span>
              </div>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-[#3156dc] to-[#7b8ef7]"
                  style={{
                    width: `${((row.avgEngagementRate ?? 0) / maxRate) * 100}%`,
                  }}
                />
              </div>
              <p className="mt-1 text-xs font-bold text-[#173b9a]">
                {row.avgEngagementRate !== null
                  ? format.number(row.avgEngagementRate, {
                      style: "percent",
                      maximumFractionDigits: 1,
                    })
                  : tCommon("notAvailable")}
              </p>
            </div>
          ))}
        </div>
      )}
    </article>
  );
}
