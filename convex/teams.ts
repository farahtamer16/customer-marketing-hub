import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { requireMember, requirePermission } from "./authz";

const workspaceRole = v.union(
  v.literal("ownerAdmin"),
  v.literal("cmo"),
  v.literal("marketingManager"),
  v.literal("socialMediaUser"),
);

// An admin can run more than one team at once — each team is just a named
// group teamMembers can be assigned into, so the same person/permission
// model still applies, just filterable by team.
export const createTeam = mutation({
  args: { name: v.string() },
  handler: async (ctx, args) => {
    const actor = await requirePermission(ctx, "manageTeam");
    const name = args.name.trim();
    if (!name) throw new Error("Team name is required");
    const id = await ctx.db.insert("teams", {
      name,
      createdBy: actor.clerkUserId ?? actor.email,
      createdAt: Date.now(),
    });
    await ctx.db.insert("auditLog", {
      actor: actor.name,
      action: "teamCreated",
      target: name,
      occurredAt: Date.now(),
    });
    return id;
  },
});

// Just id/name, for populating a "which team owns this" select — any real
// workspace member can see the list of teams that exist (not who's in them
// or their numbers), since assigning an account/campaign to a team isn't
// itself a manageTeam action.
export const listTeamNames = query({
  handler: async (ctx) => {
    await requireMember(ctx);
    const teams = await ctx.db.query("teams").collect();
    return teams.map((team) => ({ id: team._id, name: team.name }));
  },
});

export const listTeams = query({
  handler: async (ctx) => {
    await requirePermission(ctx, "manageTeam");
    const teams = await ctx.db.query("teams").collect();
    const members = await ctx.db.query("teamMembers").collect();
    return teams.map((team) => ({
      id: team._id,
      name: team.name,
      createdAt: team.createdAt,
      memberCount: members.filter((m) => m.teamId === team._id).length,
    }));
  },
});

// Real per-team rollup of the accounts and campaigns actually assigned to
// it — pipeline/LTV/spend/pipeline-from-campaigns computed from those real
// records, the same "compute at read time" rule as every other rollup in
// this app, not a stored/stale summary an admin has to trust blindly.
export const getTeamPerformance = query({
  handler: async (ctx) => {
    await requirePermission(ctx, "manageTeam");
    const [teamsList, members, accounts, campaigns] = await Promise.all([
      ctx.db.query("teams").collect(),
      ctx.db.query("teamMembers").collect(),
      ctx.db.query("growthAccounts").collect(),
      ctx.db.query("campaigns").collect(),
    ]);

    const rollupFor = (teamId: (typeof teamsList)[number]["_id"] | undefined) => {
      const teamAccounts = accounts.filter((a) => a.teamId === teamId);
      const teamCampaigns = campaigns.filter((c) => c.teamId === teamId);
      return {
        memberCount: members.filter((m) => m.teamId === teamId).length,
        accountCount: teamAccounts.length,
        pipelineValue: teamAccounts.reduce((sum, a) => sum + a.pipelineValue, 0),
        ltv: teamAccounts.reduce((sum, a) => sum + a.ltv, 0),
        campaignCount: teamCampaigns.length,
        spend: teamCampaigns.reduce((sum, c) => sum + c.spend, 0),
      };
    };

    return {
      teams: teamsList.map((team) => ({
        id: team._id,
        name: team.name,
        ...rollupFor(team._id),
      })),
      // Real accounts/campaigns/people that exist but aren't assigned to any
      // team yet — surfaced so an admin can see what's still unassigned
      // instead of it silently vanishing from every team's numbers.
      unassigned: rollupFor(undefined),
    };
  },
});

export const deleteTeam = mutation({
  args: { teamId: v.id("teams") },
  handler: async (ctx, args) => {
    await requirePermission(ctx, "manageTeam");
    // Unassign rather than delete the people in it — removing a team is a
    // grouping change, not a reason to drop real member records.
    const members = await ctx.db
      .query("teamMembers")
      .withIndex("by_teamId", (q) => q.eq("teamId", args.teamId))
      .collect();
    for (const member of members) {
      await ctx.db.patch(member._id, { teamId: undefined });
    }
    await ctx.db.delete(args.teamId);
  },
});

// Assigns an existing member to a team (or clears it) — the "linking
// actors together" step: a person and the team they're followed under.
export const assignMemberToTeam = mutation({
  args: { memberId: v.id("teamMembers"), teamId: v.optional(v.id("teams")) },
  handler: async (ctx, args) => {
    await requirePermission(ctx, "manageTeam");
    await ctx.db.patch(args.memberId, { teamId: args.teamId });
  },
});

// Used by the "admin creates the user" flow: the API route creates the
// real Clerk account first, then calls this to record the workspace member
// already linked and active — never sitting in the "invited, unlinked"
// state a self-serve sign-up would leave it in.
export const createTeamMember = mutation({
  args: {
    name: v.string(),
    email: v.string(),
    role: workspaceRole,
    clerkUserId: v.string(),
    teamId: v.optional(v.id("teams")),
  },
  handler: async (ctx, args) => {
    const actor = await requirePermission(ctx, "manageTeam");

    const existingByEmail = await ctx.db
      .query("teamMembers")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .unique();
    if (existingByEmail) throw new Error("A member with this email already exists");

    const id = await ctx.db.insert("teamMembers", {
      clerkUserId: args.clerkUserId,
      name: args.name,
      email: args.email,
      role: args.role,
      status: "active",
      lastActive: Date.now(),
      createdAt: Date.now(),
      teamId: args.teamId,
    });

    await ctx.db.insert("auditLog", {
      actor: actor.name,
      action: "memberCreated",
      target: args.name,
      occurredAt: Date.now(),
    });

    return id;
  },
});

// Checked by the API route before it touches the Clerk backend, so a
// non-admin's request never gets as far as creating a real account.
export const assertCanManageTeam = mutation({
  handler: async (ctx) => {
    await requirePermission(ctx, "manageTeam");
    return true;
  },
});

// Members across every team at once, or narrowed to one — "follow them at
// the same time or by category". Same shape as team.listMembers, plus
// teamId, so existing UI reading name/email/role/status still works.
export const listMembersByTeam = query({
  args: { teamId: v.optional(v.id("teams")) },
  handler: async (ctx, args) => {
    await requirePermission(ctx, "manageTeam");
    const members = args.teamId
      ? await ctx.db
          .query("teamMembers")
          .withIndex("by_teamId", (q) => q.eq("teamId", args.teamId))
          .collect()
      : await ctx.db.query("teamMembers").collect();
    return members.map((member) => ({
      id: member._id,
      name: member.name,
      email: member.email,
      role: member.role,
      status: member.status,
      lastActive: member.lastActive,
      teamId: member.teamId ?? null,
    }));
  },
});
