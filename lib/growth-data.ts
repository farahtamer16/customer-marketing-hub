import type { GrowthStage, SignalKind, SignalSource } from "@/types/growth";

export const journeyStages: GrowthStage[] = [
  "discover",
  "engaged",
  "demo",
  "trial",
  "activated",
  "customer",
  "renewal",
];

export const signalSources: SignalSource[] = [
  "website",
  "campaign",
  "social",
  "email",
  "crm",
  "product",
  "support",
];

export const signalKinds: SignalKind[] = [
  "pricingVisit",
  "socialQuestion",
  "campaignClick",
  "demoRequested",
  "trialStarted",
  "postCreated",
  "teamInvited",
  "supportOpened",
  "supportResolved",
  "renewalViewed",
];
