import type { DashboardRole } from "@/types/dashboard";
import AdminDashboard from "./AdminDashboard";
import CMODashboard from "./CMODashboard";
import { AccessDenied } from "./DashboardPrimitives";
import MarketingManagerDashboard from "./MarketingManagerDashboard";
import SocialMediaUserDashboard from "./SocialMediaUserDashboard";

export default function RoleDashboard({
  role,
}: {
  role: DashboardRole | null;
}) {
  if (!role) return <AccessDenied />;

  switch (role) {
    case "admin":
      return <AdminDashboard />;
    case "cmo":
      return <CMODashboard />;
    case "marketing_manager":
      return <MarketingManagerDashboard />;
    case "social_media_user":
      return <SocialMediaUserDashboard />;
    default:
      return <AccessDenied />;
  }
}
