"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  Building2,
  CalendarDays,
  FileText,
  Gauge,
  Calendar,
  MessageSquareText,
  Plus,
  Route,
  ScanSearch,
  ShieldCheck,
  UsersRound,
} from "lucide-react";
import { useTranslations } from "next-intl";
import {
  dashboardNavigation,
  HARDCODED_DASHBOARD_ROLE,
} from "@/lib/dashboard-access";

const growthIcons = {
  growthDashboard: Gauge,
  growthTeam: ShieldCheck,
  growthActivity: ScanSearch,
  growthAccounts: Building2,
  growthRevenue: BarChart3,
  growthLeads: UsersRound,
  growthJourneys: Route,
  posts: FileText,
  calendar: CalendarDays,
  comments: MessageSquareText,
};

export default function SidebarHeader() {
  const t = useTranslations("sidebar");
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();
  const growthItems = dashboardNavigation[HARDCODED_DASHBOARD_ROLE].map(
    ({ label, href }) => ({
      name: t(label),
      href,
      icon: growthIcons[label as keyof typeof growthIcons],
    }),
  );
  const dropdownItems = [
    { name: t("newPost"), href: "/create/post", post: true },
    { name: t("addComment"), href: "/comments/post", post: false },
    { name: t("newSchedule"), href: "/schedule", post: false },
  ];

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <nav className="mt-8" aria-label={t("workspace")}>
      <p className="px-3 text-[0.63rem] font-bold uppercase tracking-[0.2em] text-slate-400">
        {t("workspace")}
      </p>
      {HARDCODED_DASHBOARD_ROLE === "social_media_user" && (
        <div className="relative inline-block text-start" ref={dropdownRef}>
          <button
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors focus:outline-none"
            aria-haspopup="menu"
            aria-expanded={isOpen}
          >
            <Plus size={16} strokeWidth={2.2} />
            {t("new")}
          </button>

          {isOpen && (
            <div className="absolute start-0 z-50 mt-2 w-48 origin-top rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5">
              <div className="py-1">
                {dropdownItems.map(({ name, href, post }) => (
                  <Link
                    key={name}
                    href={href}
                    className="flex items-center gap-2 px-4 py-2 text-start text-sm text-gray-700 hover:bg-gray-100"
                    onClick={() => setIsOpen(false)}
                  >
                    {post ? (
                      <Plus size={16} strokeWidth={2.2} />
                    ) : (
                      <Calendar size={16} strokeWidth={2.2} />
                    )}
                    {name}
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <p className="mb-2 mt-7 px-3 text-[0.63rem] font-bold uppercase tracking-[0.2em] text-slate-400">
        {t("growthWorkspace")}
      </p>
      <NavItems items={growthItems} pathname={pathname} />
    </nav>
  );
}

function NavItems({
  items,
  pathname,
}: {
  items: { name: string; href: string; icon: typeof Gauge }[];
  pathname: string;
}) {
  return (
    <ul className="mt-3 space-y-1.5">
      {items.map(({ name, href, icon: Icon }) => {
        const isActive =
          pathname === href ||
          (href !== "/growth" && pathname.startsWith(`${href}/`));
        return (
          <li key={href}>
            <Link
              href={href}
              className={`group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium ${isActive ? "bg-[#173b9a] text-white shadow-[0_10px_22px_rgba(23,59,154,0.22)]" : "text-slate-600 hover:bg-white/80 hover:text-[#173b9a]"}`}
            >
              <Icon size={17} strokeWidth={isActive ? 2.3 : 1.8} />
              <span>{name}</span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
