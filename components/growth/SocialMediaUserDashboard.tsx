"use client";

import {
  CalendarClock,
  Flag,
  MessageCircleReply,
  MessagesSquare,
  Tags,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { DashboardCard, RoleDashboardShell } from "./DashboardPrimitives";

const capabilities = [
  { key: "monitor", icon: MessagesSquare, href: "/comments" },
  { key: "createSchedule", icon: CalendarClock, href: "/create/post" },
  { key: "reply", icon: MessageCircleReply, href: "/comments" },
  { key: "tag", icon: Tags, href: "/comments" },
  { key: "flagIntent", icon: Flag, href: "/comments" },
] as const;

export default function SocialMediaUserDashboard() {
  const t = useTranslations("growth.roleDashboards.social_media_user");
  return (
    <RoleDashboardShell role="social_media_user">
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
    </RoleDashboardShell>
  );
}
