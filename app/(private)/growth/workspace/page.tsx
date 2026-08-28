import RoleDashboard from "@/components/growth/RoleDashboard";
import { HARDCODED_DASHBOARD_ROLE } from "@/lib/dashboard-access";

export default function GrowthWorkspacePage() {
  return <RoleDashboard role={HARDCODED_DASHBOARD_ROLE} />;
}
