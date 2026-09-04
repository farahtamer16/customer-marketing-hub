"use client";

import { useQuery } from "convex/react";
import { CalendarClock } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import { api } from "@/convex/_generated/api";

const DAY_KEYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"] as const;

export default function BestPostingTimes() {
  const t = useTranslations("analytics.bestTimes");
  const format = useFormatter();
  const data = useQuery(api.analytics.getBestPostingTimes);

  return (
    <article className="glass-card rounded-3xl p-6">
      <div className="flex items-center gap-3">
        <span className="grid h-10 w-10 place-items-center rounded-xl bg-blue-50 text-[#3556d9]">
          <CalendarClock size={18} />
        </span>
        <div>
          <h2 className="font-semibold text-[#071e55]">{t("title")}</h2>
          <p className="mt-0.5 text-xs text-slate-500">{t("hint")}</p>
        </div>
      </div>

      {!data ? (
        <p className="mt-5 text-sm text-slate-400">{t("notReady")}</p>
      ) : !data.ready ? (
        <p className="mt-5 text-sm text-slate-400">{t("notReady")}</p>
      ) : !data.best ? (
        <p className="mt-5 text-sm text-slate-400">{t("notEnoughPerDay")}</p>
      ) : (
        <div className="mt-5">
          <p className="text-xl font-semibold text-[#071e55]">
            {t("bestDay", { day: t(`dayNames.${data.best.day}`) })}
          </p>
          <p className="mt-1 text-sm text-slate-500">
            {t("bestDayHint", {
              rate: format.number(data.best.avgEngagementRate ?? 0, {
                style: "percent",
                maximumFractionDigits: 1,
              }),
              count: data.best.posts,
            })}
          </p>
          <div className="mt-5 grid grid-cols-7 gap-1.5">
            {DAY_KEYS.map((day) => {
              const bucket = data.days.find((d) => d.day === day);
              const rate = bucket?.avgEngagementRate ?? 0;
              const isBest = data.best?.day === day;
              return (
                <div key={day} className="text-center">
                  <div className="h-16 overflow-hidden rounded-lg bg-slate-100">
                    <div
                      className={`w-full ${isBest ? "bg-[#3156dc]" : "bg-blue-200"}`}
                      style={{
                        marginTop: `${64 - Math.min(64, rate * 64 * 4)}px`,
                        height: `${Math.min(64, rate * 64 * 4)}px`,
                      }}
                    />
                  </div>
                  <p className="mt-1 text-[0.6rem] font-semibold text-slate-400">
                    {t(`dayNames.${day}`).slice(0, 3)}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </article>
  );
}
