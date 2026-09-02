import type { QueryCtx, MutationCtx } from "./_generated/server";

export type WorkspaceRole =
  | "ownerAdmin"
  | "cmo"
  | "marketingManager"
  | "socialMediaUser";

export type WorkspacePermission =
  | "manageWorkspace"
  | "manageTeam"
  | "connectData"
  | "viewExecutiveAnalytics"
  | "manageCampaigns"
  | "publishContent"
  | "manageLeads";

// Mirrors lib/workspace-data.ts's role→permission map. Kept as a separate
// copy (not imported) because Convex only bundles files reachable in a way
// that resolves cleanly without Next.js path aliases — this table is small
// and changes rarely, so duplication is the safer tradeoff here.
const permissionsByRole: Record<WorkspaceRole, WorkspacePermission[]> = {
  ownerAdmin: [
    "manageWorkspace",
    "manageTeam",
    "connectData",
    "viewExecutiveAnalytics",
    "manageCampaigns",
    "publishContent",
    "manageLeads",
  ],
  cmo: ["viewExecutiveAnalytics"],
  marketingManager: ["viewExecutiveAnalytics", "manageCampaigns", "manageLeads"],
  socialMediaUser: ["publishContent"],
};

// Throws unless the signed-in caller is a workspace member with the given
// permission. Use in every mutation that changes shared workspace state
// (accounts, campaigns, team, approvals), and in any query that reads
// shared CRM/executive data (accounts, leads, campaigns, team, audit) — a
// socialMediaUser role has none of these permissions, so gating the reads
// too is what actually keeps that role from seeing revenue and people data
// just by knowing the URL.
export async function requirePermission(
  ctx: QueryCtx | MutationCtx,
  permission: WorkspacePermission,
) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new Error("Not authenticated");

  const member = await ctx.db
    .query("teamMembers")
    .withIndex("by_clerkUserId", (q) => q.eq("clerkUserId", identity.subject))
    .unique();
  if (!member) throw new Error("You are not a member of this workspace yet");

  if (!permissionsByRole[member.role].includes(permission)) {
    throw new Error(
      `Your role (${member.role}) doesn't have permission to do this.`,
    );
  }

  return member;
}

// Like requirePermission, but only asserts workspace membership — for
// actions gated by something more specific than the static permission map
// (e.g. approvals.decide checks the current step's assigned role instead).
export async function requireMember(ctx: QueryCtx | MutationCtx) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new Error("Not authenticated");

  const member = await ctx.db
    .query("teamMembers")
    .withIndex("by_clerkUserId", (q) => q.eq("clerkUserId", identity.subject))
    .unique();
  if (!member) throw new Error("You are not a member of this workspace yet");

  return member;
}
