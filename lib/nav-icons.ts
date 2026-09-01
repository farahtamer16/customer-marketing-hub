import {
  BarChart3,
  Building2,
  CalendarDays,
  FileText,
  ListChecks,
  LineChart,
  MessageSquareText,
  Route,
  ScanSearch,
  ShieldCheck,
  UsersRound,
  type LucideIcon,
} from "lucide-react";

// Shared with SidebarHeader so the icon for a given nav destination stays
// the same everywhere it's linked from (sidebar, role-dashboard directory).
export const navIcons: Record<string, LucideIcon> = {
  growthTeam: ShieldCheck,
  growthActivity: ScanSearch,
  growthAccounts: Building2,
  growthRevenue: BarChart3,
  growthLeads: UsersRound,
  growthJourneys: Route,
  growthApprovals: ListChecks,
  posts: FileText,
  calendar: CalendarDays,
  comments: MessageSquareText,
  analytics: LineChart,
};
