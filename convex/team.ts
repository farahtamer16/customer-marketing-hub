import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import { requireInWorkspace, requirePermission } from "./authz";

const workspaceRole = v.union(
  v.literal("ownerAdmin"),
  v.literal("cmo"),
  v.literal("marketingManager"),
  v.literal("socialMediaUser"),
);

const dashboardRoleByWorkspaceRole = {
  ownerAdmin: "admin",
  cmo: "cmo",
  marketingManager: "marketing_manager",
  socialMediaUser: "social_media_user",
} as const;

export const listMembers = query({
  handler: async (ctx) => {
    const actor = await requirePermission(ctx, "manageTeam");
    const members = await ctx.db
      .query("teamMembers")
      .withIndex("by_workspaceId", (q) => q.eq("workspaceId", actor.workspaceId))
      .collect();
    return members.map((member) => ({
      id: member._id,
      name: member.name,
      email: member.email,
      role: member.role,
      status: member.status,
      lastActive: member.lastActive,
    }));
  },
});

// True only for a brand-new sign-in with no existing teamMembers row and no
// pre-invited/pre-created placeholder waiting to be linked by email — i.e.
// exactly the case where ensureCurrentMember would otherwise have to guess
// a role. The frontend gates on this to show the workspace/individual
// choice before any row (and therefore any role) is created.
export const needsOnboardingChoice = query({
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return false;

    const byClerkId = await ctx.db
      .query("teamMembers")
      .withIndex("by_clerkUserId", (q) => q.eq("clerkUserId", identity.subject))
      .unique();
    if (byClerkId) return false;

    const email = identity.email ?? "";
    if (email) {
      const invited = await ctx.db
        .query("teamMembers")
        .withIndex("by_email", (q) => q.eq("email", email))
        .unique();
      if (invited && !invited.clerkUserId) return false;
    }

    return true;
  },
});

// Called once per session so a signed-in Clerk user gets a team seat.
// Only ever handles the two cases where a role/workspace already exists:
// an existing member just gets a lastActive touch; someone already
// invited or admin-created (teams.createTeamMember) links up by email
// with the role and workspace they were already given. A genuinely new,
// uninvited sign-in has no workspace to join at all under multi-tenancy —
// that path goes through workspaces.createWorkspace instead (gated by
// needsOnboardingChoice), never through here.
export const ensureCurrentMember = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    const email = identity.email ?? "";

    const byClerkId = await ctx.db
      .query("teamMembers")
      .withIndex("by_clerkUserId", (q) => q.eq("clerkUserId", identity.subject))
      .unique();

    // Best-effort: if this person's email domain matches a growth account
    // in their own workspace (they're at a company we're tracking), a real
    // sign-in is real adoption evidence. Cooldown-guarded inside
    // logProductSignal so it doesn't fire on every page load.
    if (email) {
      await ctx.runMutation(internal.growth.logProductSignal, {
        email,
        kind: "productLogin",
        workspaceId: byClerkId?.workspaceId,
      });
    }

    if (byClerkId) {
      await ctx.db.patch(byClerkId._id, { lastActive: Date.now() });
      return byClerkId._id;
    }

    if (email) {
      const invited = await ctx.db
        .query("teamMembers")
        .withIndex("by_email", (q) => q.eq("email", email))
        .unique();
      if (invited && !invited.clerkUserId) {
        await ctx.db.patch(invited._id, {
          clerkUserId: identity.subject,
          status: "active",
          lastActive: Date.now(),
        });
        return invited._id;
      }
    }

    throw new Error("No workspace to join — create one first");
  },
});

// So a member without manageTeam permission still has a real way to get
// unstuck: who to actually ask for a different role, instead of just
// knowing the concept "an owner exists" with no way to find one.
export const getWorkspaceOwner = query({
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;
    const self = await ctx.db
      .query("teamMembers")
      .withIndex("by_clerkUserId", (q) => q.eq("clerkUserId", identity.subject))
      .unique();
    if (!self) return null;
    const owner = await ctx.db
      .query("teamMembers")
      .withIndex("by_workspaceId", (q) => q.eq("workspaceId", self.workspaceId))
      .filter((q) => q.eq(q.field("role"), "ownerAdmin"))
      .first();
    if (!owner) return null;
    return { name: owner.name, email: owner.email };
  },
});

// Resolves a teamMembers row into what the admin member-activity page
// needs — gated the same as listMembers, since this is the same data for
// one member instead of all of them.
export const getMemberDetail = query({
  args: { memberId: v.id("teamMembers") },
  handler: async (ctx, args) => {
    const actor = await requirePermission(ctx, "manageTeam");
    const member = await ctx.db.get(args.memberId);
    if (!member) return null;
    requireInWorkspace(actor, member);
    return {
      id: member._id,
      clerkUserId: member.clerkUserId ?? null,
      name: member.name,
      email: member.email,
      role: member.role,
      status: member.status,
      lastActive: member.lastActive ?? null,
    };
  },
});

export const getMyRole = query({
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;
    const member = await ctx.db
      .query("teamMembers")
      .withIndex("by_clerkUserId", (q) => q.eq("clerkUserId", identity.subject))
      .unique();
    if (!member) return null;
    return member.dashboardHint ?? dashboardRoleByWorkspaceRole[member.role];
  },
});

export const updateMemberRole = mutation({
  args: { memberId: v.id("teamMembers"), role: workspaceRole },
  handler: async (ctx, args) => {
    const actor = await requirePermission(ctx, "manageTeam");

    const member = await ctx.db.get(args.memberId);
    if (!member) throw new Error("Member not found");
    requireInWorkspace(actor, member);

    await ctx.db.patch(args.memberId, { role: args.role });

    await ctx.db.insert("auditLog", {
      actor: actor.name,
      workspaceId: actor.workspaceId,
      action: "roleChanged",
      target: `${member.name} → ${args.role}`,
      occurredAt: Date.now(),
    });
  },
});

export const removeMember = mutation({
  args: { memberId: v.id("teamMembers") },
  handler: async (ctx, args) => {
    const actor = await requirePermission(ctx, "manageTeam");
    const member = await ctx.db.get(args.memberId);
    if (!member) throw new Error("Member not found");
    requireInWorkspace(actor, member);
    await ctx.db.delete(args.memberId);
  },
});
