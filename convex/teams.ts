import { query, mutation, action, internalQuery } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import { requireInWorkspace, requireMember, requirePermission } from "./authz";

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
  args: {
    name: v.string(),
    // Members to link to the team at creation time — same id (this
    // team's) written onto each of them in one step, instead of an admin
    // assigning them one row at a time afterward.
    memberIds: v.optional(v.array(v.id("teamMembers"))),
  },
  handler: async (ctx, args) => {
    const actor = await requirePermission(ctx, "manageTeam");
    const name = args.name.trim();
    if (!name) throw new Error("Team name is required");
    const id = await ctx.db.insert("teams", {
      name,
      workspaceId: actor.workspaceId,
      createdBy: actor.clerkUserId ?? actor.email,
      createdAt: Date.now(),
    });
    for (const memberId of args.memberIds ?? []) {
      const member = await ctx.db.get(memberId);
      if (!member) continue;
      requireInWorkspace(actor, member);
      await ctx.db.patch(memberId, { teamId: id });
    }
    await ctx.db.insert("auditLog", {
      actor: actor.name,
      action: "teamCreated",
      target: name,
      workspaceId: actor.workspaceId,
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
    const actor = await requireMember(ctx);
    const teams = await ctx.db
      .query("teams")
      .withIndex("by_workspaceId", (q) => q.eq("workspaceId", actor.workspaceId))
      .collect();
    return teams.map((team) => ({ id: team._id, name: team.name }));
  },
});

export const listTeams = query({
  handler: async (ctx) => {
    const actor = await requirePermission(ctx, "manageTeam");
    const teams = await ctx.db
      .query("teams")
      .withIndex("by_workspaceId", (q) => q.eq("workspaceId", actor.workspaceId))
      .collect();
    const members = await ctx.db
      .query("teamMembers")
      .withIndex("by_workspaceId", (q) => q.eq("workspaceId", actor.workspaceId))
      .collect();
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
    const actor = await requirePermission(ctx, "manageTeam");
    const wsId = actor.workspaceId;
    const [teamsList, members, accounts, campaigns] = await Promise.all([
      ctx.db
        .query("teams")
        .withIndex("by_workspaceId", (q) => q.eq("workspaceId", wsId))
        .collect(),
      ctx.db
        .query("teamMembers")
        .withIndex("by_workspaceId", (q) => q.eq("workspaceId", wsId))
        .collect(),
      ctx.db
        .query("growthAccounts")
        .withIndex("by_workspaceId", (q) => q.eq("workspaceId", wsId))
        .collect(),
      ctx.db
        .query("campaigns")
        .withIndex("by_workspaceId", (q) => q.eq("workspaceId", wsId))
        .collect(),
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
    const actor = await requirePermission(ctx, "manageTeam");
    const team = await ctx.db.get(args.teamId);
    if (!team) throw new Error("Team not found");
    requireInWorkspace(actor, team);
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
    const actor = await requirePermission(ctx, "manageTeam");
    const member = await ctx.db.get(args.memberId);
    if (!member) throw new Error("Member not found");
    requireInWorkspace(actor, member);
    if (args.teamId) {
      const team = await ctx.db.get(args.teamId);
      if (!team) throw new Error("Team not found");
      requireInWorkspace(actor, team);
    }
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

    if (args.teamId) {
      const team = await ctx.db.get(args.teamId);
      if (!team) throw new Error("Team not found");
      requireInWorkspace(actor, team);
    }

    const id = await ctx.db.insert("teamMembers", {
      clerkUserId: args.clerkUserId,
      workspaceId: actor.workspaceId,
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
      workspaceId: actor.workspaceId,
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
    const actor = await requirePermission(ctx, "manageTeam");
    let members;
    if (args.teamId) {
      const team = await ctx.db.get(args.teamId);
      if (!team) throw new Error("Team not found");
      requireInWorkspace(actor, team);
      members = await ctx.db
        .query("teamMembers")
        .withIndex("by_teamId", (q) => q.eq("teamId", args.teamId))
        .collect();
    } else {
      members = await ctx.db
        .query("teamMembers")
        .withIndex("by_workspaceId", (q) => q.eq("workspaceId", actor.workspaceId))
        .collect();
    }
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

// Reuses the canonical permission table via an internalQuery so the action
// below (which has no ctx.db of its own) can still gate itself, same
// pattern as outreach.ts's checkSendPermission.
export const checkInvitePermission = internalQuery({
  handler: async (ctx) => {
    return await requirePermission(ctx, "manageTeam");
  },
});

// Looked up server-side rather than trusting a client-supplied workspace
// name or email — the action only ever emails the address already on file
// for a real member row, never an arbitrary address.
export const getMemberForInvite = internalQuery({
  args: { memberId: v.id("teamMembers") },
  handler: async (ctx, args) => {
    const member = await ctx.db.get(args.memberId);
    if (!member) return null;
    const workspace = await ctx.db.get(member.workspaceId);
    return { ...member, workspaceName: workspace?.name ?? "your workspace" };
  },
});

// Sends the new teammate their sign-in details by real email instead of
// leaving the admin to copy-paste and relay a temporary password by hand.
// Best-effort: a missing/misconfigured RESEND_API_KEY (or any send
// failure) doesn't fail member creation — the admin still sees the
// password in the dialog as a fallback to share manually.
export const sendInviteEmail = action({
  args: {
    memberId: v.id("teamMembers"),
    temporaryPassword: v.string(),
  },
  handler: async (ctx, args): Promise<{ sent: boolean; error?: string }> => {
    const actor = await ctx.runQuery(internal.teams.checkInvitePermission, {});
    const member = await ctx.runQuery(internal.teams.getMemberForInvite, {
      memberId: args.memberId,
    });
    if (!member) return { sent: false, error: "Member not found" };
    requireInWorkspace(actor, member);

    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      return { sent: false, error: "Email sending isn't configured yet — RESEND_API_KEY is missing." };
    }
    const fromAddress = process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev";
    const signInUrl = process.env.NEXT_PUBLIC_APP_URL
      ? `${process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "")}/sign-in`
      : undefined;

    const lines = [
      `Hi ${member.name},`,
      "",
      `You've been added to ${member.workspaceName} on Spiders AI.`,
      "",
      "Sign in with:",
      `  Email: ${member.email}`,
      `  Temporary password: ${args.temporaryPassword}`,
      "",
      signInUrl ? `Sign in here: ${signInUrl}` : undefined,
      "",
      "You'll be asked to set your own password after signing in.",
    ].filter((line): line is string => line !== undefined);

    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: fromAddress,
        to: member.email,
        subject: `You're invited to ${member.workspaceName} on Spiders AI`,
        text: lines.join("\n"),
      }),
    });
    const data = await response.json().catch(() => ({}) as { message?: string });
    if (!response.ok) {
      return { sent: false, error: data.message || `Resend request failed (${response.status})` };
    }
    return { sent: true };
  },
});
