// Business-outcome metrics derived from real account/campaign data instead
// of hardcoded demo numbers. Each function returns null when there isn't
// enough real data yet to compute an honest value (e.g. no account has
// reached "customer" with tracked stage history) — callers should render a
// "not enough data yet" state rather than fall back to a fake number.
import type { CampaignImpact, GrowthAccount } from "@/types/growth";

const DAY_MS = 24 * 60 * 60 * 1000;

export function computeAverageSalesCycleDays(
  accounts: GrowthAccount[],
): number | null {
  const cycles = accounts
    .map((account) => {
      const history = account.stageHistory;
      if (!history || history.length === 0) return null;
      const first = history[0];
      const wonAt = history.find((entry) => entry.stage === "customer");
      if (!wonAt || wonAt === first) return null;
      return (wonAt.occurredAt - first.occurredAt) / DAY_MS;
    })
    .filter((value): value is number => value !== null);

  if (cycles.length === 0) return null;
  return cycles.reduce((sum, days) => sum + days, 0) / cycles.length;
}

// "Activated" = an account that has progressed past trial. Measured against
// every account that at least reached trial, since accounts still earlier in
// the funnel haven't had the chance to activate yet.
export function computeActivationRate(accounts: GrowthAccount[]): number | null {
  const pastTrial = accounts.filter((account) =>
    ["trial", "activated", "customer", "renewal"].includes(account.stage),
  );
  if (pastTrial.length === 0) return null;
  const activated = pastTrial.filter((account) =>
    ["activated", "customer", "renewal"].includes(account.stage),
  );
  return (activated.length / pastTrial.length) * 100;
}

export function computeCustomerAcquisitionCost(
  campaigns: CampaignImpact[],
): number | null {
  const totalSpend = campaigns.reduce((sum, c) => sum + c.spend, 0);
  const totalCustomers = campaigns.reduce((sum, c) => sum + c.customers, 0);
  if (totalCustomers === 0) return null;
  return totalSpend / totalCustomers;
}

export function computeRetentionRate(campaigns: CampaignImpact[]): number | null {
  const totalCustomers = campaigns.reduce((sum, c) => sum + c.customers, 0);
  const totalRetained = campaigns.reduce((sum, c) => sum + c.retained, 0);
  if (totalCustomers === 0) return null;
  return (totalRetained / totalCustomers) * 100;
}

export function computeChurnRate(campaigns: CampaignImpact[]): number | null {
  const retention = computeRetentionRate(campaigns);
  if (retention === null) return null;
  return 100 - retention;
}

// ROI on the pipeline a campaign influenced, relative to what it cost.
export function computeROI(campaigns: CampaignImpact[]): number | null {
  const totalSpend = campaigns.reduce((sum, c) => sum + c.spend, 0);
  const totalPipeline = campaigns.reduce((sum, c) => sum + c.pipeline, 0);
  if (totalSpend === 0) return null;
  return ((totalPipeline - totalSpend) / totalSpend) * 100;
}

// Cost per lead: opportunities are the leads a campaign generated.
export function computeCostPerLead(campaigns: CampaignImpact[]): number | null {
  const totalSpend = campaigns.reduce((sum, c) => sum + c.spend, 0);
  const totalOpportunities = campaigns.reduce((sum, c) => sum + c.opportunities, 0);
  if (totalOpportunities === 0) return null;
  return totalSpend / totalOpportunities;
}

// Cost per result: the generic version of CAC, using won customers as the
// "result." Distinct from CPL, which counts opportunities/leads instead.
export function computeCostPerResult(campaigns: CampaignImpact[]): number | null {
  return computeCustomerAcquisitionCost(campaigns);
}

// LTV:CAC is a standard SaaS unit-economics benchmark — 3:1 is the widely
// cited healthy ratio (a business earns 3x what it spent acquiring the
// customer). We score progress toward that benchmark, not toward an
// arbitrary number: 100% means the account base has hit or beaten 3:1.
const HEALTHY_LTV_TO_CAC_RATIO = 3;

export function computeCacHealthScore(
  campaigns: CampaignImpact[],
): number | null {
  const cac = computeCustomerAcquisitionCost(campaigns);
  if (cac === null || cac === 0) return null;
  const totalCustomers = campaigns.reduce((sum, c) => sum + c.customers, 0);
  const totalLtv = campaigns.reduce((sum, c) => sum + c.ltv, 0);
  if (totalCustomers === 0) return null;
  const avgLtv = totalLtv / totalCustomers;
  const ratio = avgLtv / cac;
  return Math.max(0, Math.min(100, (ratio / HEALTHY_LTV_TO_CAC_RATIO) * 100));
}

// Same idea for sales-cycle length: score progress toward a commonly cited
// mid-market B2B target of 45 days, rather than an arbitrary percentage.
const TARGET_SALES_CYCLE_DAYS = 45;

export function computeSalesCycleHealthScore(
  accounts: GrowthAccount[],
): number | null {
  const avgDays = computeAverageSalesCycleDays(accounts);
  if (avgDays === null) return null;
  return Math.max(
    0,
    Math.min(100, (1 - avgDays / TARGET_SALES_CYCLE_DAYS + 1) * 50),
  );
}
