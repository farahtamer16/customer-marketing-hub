"use client";

import { useQuery } from "convex/react";
import {
  CalendarClock,
  Flag,
  MessageCircleReply,
  MessagesSquare,
  Tags,
  UserCog,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { api } from "@/convex/_generated/api";
import { DashboardCard, RoleDashboardShell } from "./DashboardPrimitives";
import MyTeamTasksCard from "./MyTeamTasksCard";

const capabilities = [
  { key: "monitor", icon: MessagesSquare, href: "/comments" },
  { key: "createSchedule", icon: CalendarClock, href: "/create/post" },
  { key: "reply", icon: MessageCircleReply, href: "/comments" },
  { key: "tag", icon: Tags, href: "/comments" },
  { key: "flagIntent", icon: Flag, href: "/comments" },
] as const;

export default function SocialMediaUserDashboard() {
  const t = useTranslations("growth.roleDashboards.social_media_user");
  // Someone landing here as the default role has no way to know who can
  // give them more access — this is that way.
  const owner = useQuery(api.team.getWorkspaceOwner);

  return (
    <RoleDashboardShell role="social_media_user">
      {owner && (
        <div className="mb-6 flex items-start gap-3 rounded-2xl border border-amber-100 bg-amber-50/70 px-4 py-3 text-amber-900">
          <UserCog className="mt-0.5 shrink-0" size={17} />
          <div>
            <p className="text-sm font-semibold">{t("roleUpgradeTitle")}</p>
            <p className="mt-1 text-xs leading-5 text-amber-700">
              {t("roleUpgradeDescription", {
                name: owner.name,
                email: owner.email || t("roleUpgradeNoEmail"),
              })}
            </p>
          </div>
        </div>
      )}
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {capabilities.map(({ key, icon, href }) => (
          <DashboardCard
            key={key}
            icon={icon}
            title={t(`capabilities.${key}.title`)}
            description={t(`capabilities.${key}.description`)}
            href={href}
          />
        ))}
      </section>
      <section className="mt-6">
        <MyTeamTasksCard />
      </section>
    </RoleDashboardShell>
  );
}
