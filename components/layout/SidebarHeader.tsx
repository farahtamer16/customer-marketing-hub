"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useQuery } from "convex/react";
import { Calendar, Gauge, House, Info, LayoutGrid, Plus, ShieldCheck } from "lucide-react";
import { useTranslations } from "next-intl";
import { api } from "@/convex/_generated/api";
import { dashboardNavigation } from "@/lib/dashboard-access";
import { useStudioMode } from "@/hooks/useStudioMode";
import { navIcons } from "@/lib/nav-icons";
import type { DashboardRole } from "@/types/dashboard";

const STUDIO_TABS = ["posts", "calendar", "comments", "analytics"] as const;

export default function SidebarHeader() {
  const t = useTranslations("sidebar");
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();
  const role = useQuery(api.team.getMyRole);
  const isAdmin = role === "admin";
  const studio = useStudioMode();
  const teams = useQuery(api.teams.listTeamNames, isAdmin ? {} : "skip") ?? [];
  const items = role ? dashboardNavigation[role] : [];
  const inStudioMode = isAdmin && studio.mode === "content";
  const showStudioNav = inStudioMode && studio.teamId;
  const contentItems = showStudioNav
    ? STUDIO_TABS.map((tabValue) => ({
        name: t(`studioTabs.${tabValue}`),
        href: `/growth/studio/${studio.teamId}/${tabValue}`,
        icon: navIcons[tabValue],
      }))
    : inStudioMode
      // Content Studio mode with no team chosen yet — the picker above
      // handles that, so nothing to link to until one is selected.
      ? []
      : items
          .filter((item) => item.section === "content")
          .map(({ label, href }) => ({
            name: t(label),
            href,
            icon: navIcons[label],
          }));
  // Growth Hub is always available regardless of mode — Content Studio is
  // an additional view, not a replacement for it.
  const growthItems = items
    .filter((item) => item.section === "growth")
    .map(({ label, href }) => ({
      name: t(label),
      href,
      icon: navIcons[label],
    }));
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
      <RoleBadge role={role} />

      {isAdmin && (
        <div className="mt-4">
          <div className="flex gap-1 rounded-xl bg-white/70 p-1">
            <button
              type="button"
              onClick={() => studio.setMode("admin")}
              className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg px-2 py-2 text-xs font-semibold ${studio.mode === "admin" ? "bg-[#173b9a] text-white" : "text-slate-500 hover:text-[#173b9a]"}`}
            >
              <ShieldCheck size={14} />
              {t("modeAdmin")}
            </button>
            <button
              type="button"
              onClick={() => studio.setMode("content")}
              className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg px-2 py-2 text-xs font-semibold ${studio.mode === "content" ? "bg-[#173b9a] text-white" : "text-slate-500 hover:text-[#173b9a]"}`}
            >
              <LayoutGrid size={14} />
              {t("modeContentStudio")}
            </button>
          </div>
          {studio.mode === "content" && (
            <div className="mt-3">
              <label className="block text-[0.62rem] font-bold uppercase tracking-[0.12em] text-slate-400">
                {t("studioTeamLabel")}
              </label>
              <select
                value={studio.teamId ?? ""}
                onChange={(event) => studio.setTeamId(event.target.value || null)}
                className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-xs font-semibold text-slate-700 outline-none focus:border-blue-400"
              >
                <option value="">{t("studioTeamPlaceholder")}</option>
                {teams.map((team) => (
                  <option key={team.id} value={team.id}>
                    {team.name}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      )}

      {role === "social_media_user" && (
        <div className="relative mt-4 inline-block text-start" ref={dropdownRef}>
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

      <ul className="mt-6 space-y-1.5">
        <li>
          <Link
            href="/home"
            className={`group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium ${pathname === "/home" ? "bg-[#173b9a] text-white shadow-[0_10px_22px_rgba(23,59,154,0.22)]" : "text-slate-600 hover:bg-white/80 hover:text-[#173b9a]"}`}
          >
            <House size={17} strokeWidth={pathname === "/home" ? 2.3 : 1.8} />
            <span>{t("home")}</span>
          </Link>
        </li>
      </ul>

      {contentItems.length > 0 && (
        <NavSection
          title={t("contentStudio")}
          hint={t("contentStudioHint")}
          items={contentItems}
          pathname={pathname}
        />
      )}

      {growthItems.length > 0 && (
        <NavSection
          title={t("growthHub")}
          hint={t("growthHubHint")}
          items={growthItems}
          pathname={pathname}
        />
      )}
    </nav>
  );
}

function RoleBadge({ role }: { role: DashboardRole | null | undefined }) {
  const t = useTranslations("sidebar");
  const roleT = useTranslations("growth.roleDashboards");
  if (!role) return null;

  return (
    <div
      className="group relative flex items-center gap-2 rounded-xl border border-blue-100 bg-blue-50/70 px-3 py-2.5 text-xs"
      title={roleT(`${role}.accessDescription`)}
    >
      <span className="flex-1 min-w-0">
        <span className="block text-[0.6rem] font-bold uppercase tracking-[0.14em] text-blue-400">
          {t("viewingAs")}
        </span>
        <span className="block truncate font-semibold text-[#173b9a]">
          {roleT(`${role}.accessLevel`)}
        </span>
      </span>
      <Info size={14} className="shrink-0 text-blue-400" aria-label={t("roleInfo")} />
    </div>
  );
}

function NavSection({
  title,
  hint,
  items,
  pathname,
}: {
  title: string;
  hint: string;
  items: { name: string; href: string; icon: typeof Gauge }[];
  pathname: string;
}) {
  return (
    <div className="mt-7">
      <p className="px-3 text-[0.63rem] font-bold uppercase tracking-[0.2em] text-slate-400">
        {title}
      </p>
      <p className="mb-2 px-3 text-[0.68rem] text-slate-400">{hint}</p>
      <NavItems items={items} pathname={pathname} />
    </div>
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
