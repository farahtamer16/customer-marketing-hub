import type {
  WorkspaceJourneyStep,
  WorkspaceMember,
  WorkspacePermission,
  WorkspaceRole,
  WorkspaceRoleDefinition,
} from "@/types/growth";

const day = 24 * 60 * 60 * 1000;
const demoNow = Date.UTC(2026, 7, 25, 9, 0);

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

export const workspaceMembers: WorkspaceMember[] = [
  {
    id: "member-farah",
    name: "Farah Tamer",
    email: "farah@spiders.example",
    role: "ownerAdmin",
    status: "active",
    lastActive: demoNow - 35 * 60 * 1000,
  },
  {
    id: "member-sarah",
    name: "Sarah Alotaibi",
    email: "sarah@spiders.example",
    role: "cmo",
    status: "active",
    lastActive: demoNow - day,
  },
  {
    id: "member-omar",
    name: "Omar Saleh",
    email: "omar@spiders.example",
    role: "marketingManager",
    status: "active",
    lastActive: demoNow - 2 * day,
  },
  {
    id: "member-noura",
    name: "Noura Hassan",
    email: "noura@spiders.example",
    role: "socialMediaUser",
    status: "active",
    lastActive: demoNow - 3 * 60 * 60 * 1000,
  },
];

export const workspaceJourney: WorkspaceJourneyStep[] = [
  { stage: "workspaceCreated", owner: "ownerAdmin", completed: true },
  { stage: "dataConnected", owner: "ownerAdmin", completed: true },
  { stage: "teamInvited", owner: "ownerAdmin", completed: true },
  {
    stage: "permissionsAssigned",
    owner: "ownerAdmin",
    completed: true,
  },
  {
    stage: "firstCampaign",
    owner: "marketingManager",
    completed: true,
  },
  { stage: "growthOperations", owner: "cmo", completed: false },
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
