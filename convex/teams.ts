import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { requirePermission } from "./authz";

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
