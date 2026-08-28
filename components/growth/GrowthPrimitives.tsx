"use client";

import type { LucideIcon } from "lucide-react";
import {
  BadgeCheck,
  Database,
  FlaskConical,
  Globe2,
  Headphones,
  Mail,
  Megaphone,
  PackageCheck,
  Share2,
} from "lucide-react";
import { useTranslations } from "next-intl";
import type { GrowthStage, SignalSource } from "@/types/growth";

const sourceIcons: Record<SignalSource, LucideIcon> = {
  website: Globe2,
  campaign: Megaphone,
  social: Share2,
  email: Mail,
  crm: Database,
  product: PackageCheck,
  support: Headphones,
};

const sourceTones: Record<SignalSource, string> = {
  website: "bg-sky-50 text-sky-700",
  campaign: "bg-violet-50 text-violet-700",
  social: "bg-blue-50 text-blue-700",
  email: "bg-amber-50 text-amber-700",
  crm: "bg-indigo-50 text-indigo-700",
  product: "bg-emerald-50 text-emerald-700",
  support: "bg-rose-50 text-rose-700",
};

const stageTones: Record<GrowthStage, string> = {
  discover: "bg-slate-100 text-slate-600",
  engaged: "bg-sky-100 text-sky-700",
  demo: "bg-violet-100 text-violet-700",
  trial: "bg-amber-100 text-amber-800",
  activated: "bg-emerald-100 text-emerald-700",
  customer: "bg-blue-100 text-blue-700",
  renewal: "bg-fuchsia-100 text-fuchsia-700",
};

export function DemoModeBanner() {
  const t = useTranslations("growth");

  return (
    <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-violet-200 bg-gradient-to-r from-violet-50 to-blue-50 px-4 py-3 text-sm text-violet-900">
      <span className="inline-flex items-center gap-2 font-semibold">
        <FlaskConical size={16} /> {t("demo.label")}
      </span>
      <span className="text-xs text-violet-700">{t("demo.description")}</span>
    </div>
  );
}

export function MetricCard({
  label,
  value,
  change,
  icon: Icon,
  tone = "bg-blue-50 text-blue-700",
}: {
  label: string;
  value: string;
  change?: string;
  icon: LucideIcon;
  tone?: string;
}) {
  return (
    <article className="glass-card rounded-2xl p-5">
      <div className="flex items-start justify-between gap-4">
        <span
          className={`grid h-10 w-10 place-items-center rounded-xl ${tone}`}
        >
          <Icon size={18} />
        </span>
        {change && (
          <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[0.65rem] font-bold text-emerald-700">
            {change}
          </span>
        )}
      </div>
      <p className="mt-5 text-2xl font-semibold tracking-[-0.04em] text-[#071e55]">
        {value}
      </p>
      <p className="mt-1 text-xs text-slate-500">{label}</p>
    </article>
  );
}

export function ScoreMeter({
  label,
  value,
  compact = false,
}: {
  label: string;
  value: number;
  compact?: boolean;
}) {
  const tone =
    value >= 75
      ? "from-emerald-400 to-emerald-500"
      : value >= 50
        ? "from-amber-400 to-orange-400"
        : "from-rose-400 to-rose-500";

  return (
    <div className={compact ? "min-w-28" : "w-full"}>
      <div className="flex items-center justify-between gap-3 text-xs">
        <span className="text-slate-500">{label}</span>
        <span className="font-bold text-[#071e55]">{value}</span>
      </div>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100">
        <div
          className={`h-full rounded-full bg-gradient-to-r ${tone}`}
          style={{ width: `${Math.max(2, value)}%` }}
        />
      </div>
    </div>
  );
}

export function SourcePill({ source }: { source: SignalSource }) {
  const t = useTranslations("growth.sources");
  const Icon = sourceIcons[source];

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[0.68rem] font-semibold ${sourceTones[source]}`}
    >
      <Icon size={12} /> {t(source)}
    </span>
  );
}

export function StagePill({ stage }: { stage: GrowthStage }) {
  const t = useTranslations("growth.stages");

  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-[0.68rem] font-bold ${stageTones[stage]}`}
    >
      {t(stage)}
    </span>
  );
}

export function AccountAvatar({ name }: { name: string }) {
  const initials = name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2);

  return (
    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-[#d8fff0] to-[#bed1ff] text-xs font-bold text-[#173b9a]">
      {initials}
    </span>
  );
}

export function ConnectedSignalBadge() {
  const t = useTranslations("growth");
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-[0.65rem] font-bold text-emerald-700">
      <BadgeCheck size={12} /> {t("connectedSignal")}
    </span>
  );
}
