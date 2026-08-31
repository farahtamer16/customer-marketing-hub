import type { DashboardRole } from "@/types/dashboard";

type DashboardNavLabel =
  | "growthDashboard"
  | "growthTeam"
  | "growthActivity"
  | "growthAccounts"
  | "growthRevenue"
  | "growthLeads"
  | "growthJourneys"
  | "growthApprovals"
  | "posts"
  | "calendar"
  | "comments"
  | "analytics";

export const dashboardNavigation: Record<
  DashboardRole,
  { label: DashboardNavLabel; href: string }[]
> = {
  // The owner/admin has every permission, so their nav covers the whole
  // app — everyone else gets a curated set for their role.
  admin: [
    { label: "growthDashboard", href: "/home" },
    { label: "growthAccounts", href: "/growth/accounts" },
    { label: "growthLeads", href: "/growth/leads" },
    { label: "growthJourneys", href: "/growth/journeys" },
    { label: "growthApprovals", href: "/growth/approvals" },
    { label: "growthRevenue", href: "/growth/revenue" },
    { label: "growthTeam", href: "/growth/team" },
    { label: "growthActivity", href: "/growth/activity" },
    { label: "posts", href: "/posts" },
    { label: "calendar", href: "/schedule" },
    { label: "comments", href: "/comments" },
    { label: "analytics", href: "/analytics" },
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
