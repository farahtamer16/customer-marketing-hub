import type {
  WorkspacePermission,
  WorkspaceRole,
  WorkspaceRoleDefinition,
} from "@/types/growth";

export const workspaceRoles: WorkspaceRoleDefinition[] = [
  {
    role: "ownerAdmin",
    focus: "governance",
    permissions: [
      "manageWorkspace",
      "manageTeam",
      "connectData",
      "viewExecutiveAnalytics",
      "manageCampaigns",
      "publishContent",
      "manageLeads",
    ],
  },
  {
    role: "cmo",
    focus: "executive",
    permissions: ["viewExecutiveAnalytics"],
  },
  {
    role: "marketingManager",
    focus: "campaigns",
    permissions: ["viewExecutiveAnalytics", "manageCampaigns", "manageLeads"],
  },
  {
    role: "socialMediaUser",
    focus: "content",
    permissions: ["publishContent"],
  },
];

export const workspacePermissions: WorkspacePermission[] = [
  "manageWorkspace",
  "manageTeam",
  "connectData",
  "viewExecutiveAnalytics",
  "manageCampaigns",
  "publishContent",
  "manageLeads",
];

export function getWorkspaceRole(role: WorkspaceRole) {
  return workspaceRoles.find((definition) => definition.role === role)!;
}
