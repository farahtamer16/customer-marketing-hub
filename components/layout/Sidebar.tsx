"use client";

import Link from "next/link";
import { useUser } from "@clerk/nextjs";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import BrandMark from "@/components/hub/BrandMark";
import SidebarFooter from "./SidebarFooter";
import SidebarHeader from "./SidebarHeader";
import { useTranslations } from "next-intl";

export default function Sidebar() {
  const t = useTranslations("sidebar");
  const common = useTranslations("common");
  const { user } = useUser();
  const userId = user?.id;

  const accounts = useQuery(api.socialAccounts.getAccountsForUser, { userId });

  return (
    <aside className="sticky top-0 z-30 hidden h-screen w-[18rem] shrink-0 flex-col overflow-y-auto border-e border-white/70 bg-[#eaf8f7]/85 px-5 py-6 backdrop-blur-2xl md:flex">
      <BrandMark />
      <SidebarHeader />

      <section className="mt-8 rounded-2xl border border-white bg-white/55 p-3.5">
        <div className="flex items-center justify-between">
          <p className="text-[0.63rem] font-bold uppercase tracking-[0.17em] text-slate-400">
            {t("connectedChannels")}
          </p>
          <Link
            href="/connect/social-accounts"
            className="text-[0.62rem] font-bold text-[#2854dc] hover:text-[#173b9a]"
          >
            {common("connect")}
          </Link>
        </div>
        <div className="mt-3 space-y-2.5">
          {accounts === undefined ? (
            <p className="text-xs text-slate-400">{t("loadingAccounts")}</p>
          ) : accounts.length === 0 ? (
            <p className="text-xs text-slate-400">{t("noAccounts")}</p>
          ) : (
            accounts.map((account) => (
              <div key={account._id} className="flex items-center gap-2.5">
                <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_0_3px_rgba(52,211,153,0.14)]" />
                <div className="min-w-0">
                  <p className="truncate text-xs font-semibold text-slate-700">
                    {account.accountName}
                  </p>
                  <p className="text-[0.62rem] text-slate-400">
                    {account.platform}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      <SidebarFooter />
    </aside>
  );
}
