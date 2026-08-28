"use client";

import { Check, Clock3, ShieldCheck, UserRoundX } from "lucide-react";
import { useTranslations } from "next-intl";
import type { WorkspaceMember, WorkspaceRole } from "@/types/growth";
import { DemoModeBanner } from "./GrowthPrimitives";

const roleTones: Record<WorkspaceRole, string> = {
  ownerAdmin: "bg-indigo-100 text-indigo-700",
  cmo: "bg-violet-100 text-violet-700",
  marketingManager: "bg-blue-100 text-blue-700",
  socialMediaUser: "bg-sky-100 text-sky-700",
};

export function MemberAvatar({ name }: { name: string }) {
  const initials = name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2);
  return (
    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-gradient-to-br from-[#d8fff0] to-[#bed1ff] text-xs font-bold text-[#173b9a]">
      {initials}
    </span>
  );
}

export function WorkspaceRolePill({ role }: { role: WorkspaceRole }) {
  const t = useTranslations("growth.workspaceRoles");
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-[0.68rem] font-bold ${roleTones[role]}`}
    >
      {t(role)}
    </span>
  );
}

export function MemberStatusPill({
  status,
}: {
  status: WorkspaceMember["status"];
}) {
  const t = useTranslations("growth.team.statuses");
  const styles = {
    active: "bg-emerald-50 text-emerald-700",
    invited: "bg-blue-50 text-blue-700",
    suspended: "bg-slate-100 text-slate-600",
  }[status];
  const Icon =
    status === "active" ? Check : status === "invited" ? Clock3 : UserRoundX;
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[0.68rem] font-bold ${styles}`}
    >
      <Icon size={12} /> {t(status)}
    </span>
  );
}

export function FrontendAccessNotice() {
  const t = useTranslations("growth.team");
  return (
    <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50/80 px-4 py-3 text-amber-900">
      <ShieldCheck className="mt-0.5 shrink-0" size={17} />
      <div>
        <p className="text-sm font-semibold">{t("frontendNotice")}</p>
        <p className="mt-1 text-xs leading-5 text-amber-700">
          {t("frontendNoticeDescription")}
        </p>
      </div>
    </div>
  );
}

export function PrototypeNotices() {
  return (
    <>
      <DemoModeBanner />
      <FrontendAccessNotice />
    </>
  );
}
