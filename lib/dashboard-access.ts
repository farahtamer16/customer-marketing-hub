import type { DashboardRole } from "@/types/dashboard";

type DashboardNavLabel =
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
  | "analytics"
  | "tasks";

// "content" = the social publishing tool (posts, scheduling, comments,
// analytics). "growth" = the B2B customer growth / CRM hub (accounts,
// leads, journeys, approvals, revenue, team, audit). Kept as two visibly
// separate groups in the sidebar since they're two different products
// sharing one workspace, not one flat feature list.
type NavSection = "content" | "growth";

interface NavEntry {
  label: DashboardNavLabel;
  href: string;
  section: NavSection;
}

export const dashboardNavigation: Record<DashboardRole, NavEntry[]> = {
  // The owner/admin has every permission. Their "content" section isn't
  // listed here — it's not one admin's own posts, it's whichever team
  // they've picked in Content Studio mode (SidebarHeader builds those nav
  // entries dynamically from useStudioMode's selected team).
  admin: [
    { label: "growthAccounts", href: "/growth/accounts", section: "growth" },
    { label: "growthLeads", href: "/growth/leads", section: "growth" },
    { label: "growthJourneys", href: "/growth/journeys", section: "growth" },
    { label: "growthApprovals", href: "/growth/approvals", section: "growth" },
    { label: "growthRevenue", href: "/growth/revenue", section: "growth" },
    { label: "growthTeam", href: "/growth/team", section: "growth" },
    { label: "growthActivity", href: "/growth/activity", section: "growth" },
  ],
  cmo: [
    { label: "growthAccounts", href: "/growth/accounts", section: "growth" },
    { label: "growthRevenue", href: "/growth/revenue", section: "growth" },
  ],
  marketing_manager: [
    { label: "growthAccounts", href: "/growth/accounts", section: "growth" },
    { label: "growthLeads", href: "/growth/leads", section: "growth" },
    { label: "growthJourneys", href: "/growth/journeys", section: "growth" },
  ],
  social_media_user: [
    { label: "posts", href: "/posts", section: "content" },
    { label: "calendar", href: "/schedule", section: "content" },
    { label: "comments", href: "/comments", section: "content" },
    { label: "tasks", href: "/tasks", section: "content" },
  ],
};
