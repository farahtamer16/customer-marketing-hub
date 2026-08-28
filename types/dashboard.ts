export type DashboardRole =
  "admin" | "cmo" | "marketing_manager" | "social_media_user";

export type DashboardAccess = {
  type: DashboardRole;
};
