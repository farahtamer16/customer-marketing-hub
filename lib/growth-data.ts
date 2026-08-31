import type { GrowthStage, SignalSource } from "@/types/growth";

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
