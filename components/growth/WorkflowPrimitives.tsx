"use client";

import { BellRing, CircleDot } from "lucide-react";
import { useTranslations } from "next-intl";
import { FacebookIcon, InstagramIcon } from "@/components/ui/ChannelIcons";
import type { ApprovalStatus } from "@/types/workflow";

const statusTones: Record<ApprovalStatus, string> = {
  draft: "bg-slate-100 text-slate-600",
  pending: "bg-amber-100 text-amber-800",
  changesRequested: "bg-rose-100 text-rose-700",
  approved: "bg-emerald-100 text-emerald-700",
  rejected: "bg-red-100 text-red-700",
  scheduled: "bg-blue-100 text-blue-700",
  published: "bg-violet-100 text-violet-700",
};

export function ApprovalStatusPill({ status }: { status: ApprovalStatus }) {
  const t = useTranslations("growth.approvalStatuses");
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-[0.68rem] font-bold ${statusTones[status]}`}
    >
      {t(status)}
    </span>
  );
}

export function ChannelPills({
  channels,
}: {
  channels: ("facebook" | "instagram")[];
}) {
  const t = useTranslations("growth.approvals.channels");
  return (
    <span className="flex flex-wrap gap-1.5">
      {channels.map((channel) => {
        const Icon = channel === "facebook" ? FacebookIcon : InstagramIcon;
        return (
          <span
            key={channel}
            className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-1 text-[0.68rem] font-semibold text-blue-700"
          >
            <Icon className="h-3 w-3" /> {t(channel)}
          </span>
        );
      })}
    </span>
  );
}

export function UnreadDot() {
  return <CircleDot size={13} className="text-[#3156dc]" aria-hidden="true" />;
}

export function NotificationIcon() {
  return (
    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-violet-50 text-violet-700">
      <BellRing size={18} />
    </span>
  );
}
