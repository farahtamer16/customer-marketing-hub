export type GrowthStage =
  | "discover"
  | "engaged"
  | "demo"
  | "trial"
  | "activated"
  | "customer"
  | "renewal";

export type SignalSource =
  "website" | "campaign" | "social" | "email" | "crm" | "product" | "support";

export type BuyingRole =
  "decisionMaker" | "champion" | "user" | "technicalEvaluator";

export type NextAction =
  | "bookExecutiveDemo"
  | "shareSecurityGuide"
  | "inviteSecondAdmin"
  | "resolveSupportBlocker"
  | "launchRenewalReview";

export type SignalKind =
  | "pricingVisit"
  | "socialQuestion"
  | "campaignClick"
  | "demoRequested"
  | "trialStarted"
  | "postCreated"
  | "teamInvited"
  | "supportOpened"
  | "supportResolved"
  | "renewalViewed";

export interface BuyingMember {
  id: string;
  name: string;
  title: string;
  role: BuyingRole;
  score: number;
  email: string;
  status: "active" | "missing" | "atRisk";
}

export interface GrowthSignal {
  id: string;
  source: SignalSource;
  kind: SignalKind;
  occurredAt: number;
  detail?: string;
  postId?: string;
}

export interface GrowthAccount {
  id: string;
  name: string;
  domain: string;
  industry: string;
  employees: number;
  tier: "enterprise" | "midMarket" | "smallBusiness";
  stage: GrowthStage;
  intentScore: number;
  engagementScore: number;
  adoptionScore: number;
  buyingGroupCoverage: number;
  pipelineValue: number;
  ltv: number;
  owner: string;
  nextAction: NextAction;
  members: BuyingMember[];
  signals: GrowthSignal[];
}

export interface GrowthLead {
  id: string;
  name: string;
  title: string;
  accountId: string;
  role: BuyingRole;
  score: number;
  intent: "high" | "medium" | "low";
  source: SignalSource;
  lastSignal: SignalKind;
  nextAction: NextAction;
}

export interface CampaignImpact {
  id: string;
  name: string;
  channel: SignalSource;
  spend: number;
  accounts: number;
  opportunities: number;
  pipeline: number;
  customers: number;
  retained: number;
  ltv: number;
}

export type WorkspaceRole =
  "ownerAdmin" | "cmo" | "marketingManager" | "socialMediaUser";

export type WorkspacePermission =
  | "manageWorkspace"
  | "manageTeam"
  | "connectData"
  | "viewExecutiveAnalytics"
  | "manageCampaigns"
  | "publishContent"
  | "manageLeads";

export type WorkspaceJourneyStage =
  | "workspaceCreated"
  | "dataConnected"
  | "teamInvited"
  | "permissionsAssigned"
  | "firstCampaign"
  | "growthOperations";

export interface WorkspaceMember {
  id: string;
  name: string;
  email: string;
  role: WorkspaceRole;
  status: "active" | "invited" | "suspended";
  lastActive?: number;
}

export interface WorkspaceRoleDefinition {
  role: WorkspaceRole;
  permissions: WorkspacePermission[];
  focus: "governance" | "executive" | "campaigns" | "content";
}

export interface WorkspaceJourneyStep {
  stage: WorkspaceJourneyStage;
  owner: WorkspaceRole;
  completed: boolean;
}
