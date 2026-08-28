"use client";

import Link from "next/link";
import { ArrowUpRight, LockKeyhole, type LucideIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import PageHeader from "@/components/hub/PageHeader";
import type { DashboardRole } from "@/types/dashboard";

export function RoleDashboardShell({
  role,
  children,
}: {
  role: DashboardRole;
  children: React.ReactNode;
}) {
  const t = useTranslations(`growth.roleDashboards.${role}`);
  return (
    <>
      <PageHeader
        eyebrow={t("eyebrow")}
        title={t("title")}
        description={t("description")}
      />
      <div className="mb-6 flex items-start gap-3 rounded-2xl border border-blue-100 bg-blue-50/70 px-4 py-3 text-blue-900">
        <LockKeyhole className="mt-0.5 shrink-0" size={17} />
        <div>
          <p className="text-sm font-semibold">{t("accessLevel")}</p>
          <p className="mt-1 text-xs leading-5 text-blue-700">
            {t("accessDescription")}
          </p>
        </div>
      </div>
      {children}
    </>
  );
}

export function DashboardCard({
  icon: Icon,
  title,
  description,
  href,
  value,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  href?: string;
  value?: string;
}) {
  const content = (
    <>
      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-blue-50 text-[#3156dc]">
        <Icon size={20} />
      </span>
      <span className="min-w-0 flex-1">
        {value && (
          <span className="mb-2 block text-2xl font-semibold text-[#071e55]">
            {value}
          </span>
        )}
        <span className="block text-sm font-semibold text-[#071e55]">
          {title}
        </span>
        <span className="mt-1 block text-xs leading-5 text-slate-500">
          {description}
        </span>
      </span>
      {href && <ArrowUpRight size={15} className="text-slate-300" />}
    </>
  );
  const className =
    "glass-card flex items-start gap-4 rounded-2xl p-5 transition hover:border-blue-200";
  return href ? (
    <Link href={href} className={className}>
      {content}
    </Link>
  ) : (
    <article className={className}>{content}</article>
  );
}

export function AccessDenied() {
  const t = useTranslations("growth.roleDashboards.accessDenied");
  return (
    <div className="glass-card mx-auto max-w-xl rounded-3xl p-10 text-center">
      <LockKeyhole className="mx-auto text-slate-400" size={30} />
      <h1 className="mt-5 text-2xl font-semibold text-[#071e55]">
        {t("title")}
      </h1>
      <p className="mt-2 text-sm leading-6 text-slate-500">
        {t("description")}
      </p>
    </div>
  );
}
