import type { DashboardRole } from "@/types/dashboard";

type DashboardNavLabel =
  | "growthDashboard"
  | "growthTeam"
  | "growthActivity"
  | "growthAccounts"
  | "growthRevenue"
  | "growthLeads"
  | "growthJourneys"
  | "posts"
  | "calendar"
  | "comments";

export const dashboardNavigation: Record<
  DashboardRole,
  { label: DashboardNavLabel; href: string }[]
> = {
  admin: [
    { label: "growthDashboard", href: "/home" },
    { label: "growthTeam", href: "/growth/team" },
    { label: "growthActivity", href: "/growth/activity" },
  ],
  cmo: [
    { label: "growthDashboard", href: "/home" },
    { label: "growthAccounts", href: "/growth/accounts" },
    { label: "growthRevenue", href: "/growth/revenue" },
  ],
  marketing_manager: [
    { label: "growthDashboard", href: "/home" },
    { label: "growthAccounts", href: "/growth/accounts" },
    { label: "growthLeads", href: "/growth/leads" },
    { label: "growthJourneys", href: "/growth/journeys" },
  ],
  social_media_user: [
    { label: "growthDashboard", href: "/home" },
    { label: "posts", href: "/posts" },
    { label: "calendar", href: "/schedule" },
    { label: "comments", href: "/comments" },
  ],
};
