import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import { requirePermission } from "./authz";

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
    await requirePermission(ctx, "manageTeam");
    const members = await ctx.db.query("teamMembers").collect();
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

// Called once per session so a signed-in Clerk user gets a team seat: the
// first person ever to sign in becomes the workspace owner, an invited
// member is linked up by email, and anyone else lands as a basic
// contributor until an owner promotes them.
export const ensureCurrentMember = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    const email = identity.email ?? "";

    // Best-effort: if this person's email domain matches a growth account
    // (they're at a company we're tracking), a real sign-in is real
    // adoption evidence. Cooldown-guarded inside logProductSignal so it
    // doesn't fire on every page load.
    if (email) {
      await ctx.runMutation(internal.growth.logProductSignal, {
        email,
        kind: "productLogin",
      });
    }

    const byClerkId = await ctx.db
      .query("teamMembers")
      .withIndex("by_clerkUserId", (q) => q.eq("clerkUserId", identity.subject))
      .unique();
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

    const anyMember = await ctx.db.query("teamMembers").first();
    const role = anyMember ? "socialMediaUser" : "ownerAdmin";
    const name = identity.name ?? email ?? "New member";

    const id = await ctx.db.insert("teamMembers", {
      clerkUserId: identity.subject,
      name,
      email,
      role,
      status: "active",
      lastActive: Date.now(),
      createdAt: Date.now(),
    });

    // The one person this silently, automatically happens to is the admin:
    // without this, a new uninvited sign-in lands as socialMediaUser with
    // no one told it happened, and no visible way for either side to know
    // a role needs setting. A real notification instead of a dead end.
    if (anyMember) {
      await ctx.db.insert("workspaceNotifications", {
        kind: "system",
        title: "New member joined",
        detail: `${name}${email ? ` (${email})` : ""} signed in and joined as Social Media User — review their role if that's not right.`,
        occurredAt: Date.now(),
        read: false,
        href: "/growth/team",
      });
    }

    return id;
  },
});

// So a member without manageTeam permission still has a real way to get
// unstuck: who to actually ask for a different role, instead of just
// knowing the concept "an owner exists" with no way to find one.
export const getWorkspaceOwner = query({
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;
    const owner = await ctx.db
      .query("teamMembers")
      .filter((q) => q.eq(q.field("role"), "ownerAdmin"))
      .first();
    if (!owner) return null;
    return { name: owner.name, email: owner.email };
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
    return dashboardRoleByWorkspaceRole[member.role];
  },
});

export const inviteMember = mutation({
  args: {
    name: v.string(),
    email: v.string(),
    role: workspaceRole,
  },
  handler: async (ctx, args) => {
    const actor = await requirePermission(ctx, "manageTeam");

    const existing = await ctx.db
      .query("teamMembers")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .unique();
    if (existing) throw new Error("A member with this email already exists");

    const id = await ctx.db.insert("teamMembers", {
      name: args.name,
      email: args.email,
      role: args.role,
      status: "invited",
      createdAt: Date.now(),
    });

    await ctx.db.insert("auditLog", {
      actor: actor.name,
      action: "memberInvited",
      target: args.name,
      occurredAt: Date.now(),
    });

    return id;
  },
});

export const updateMemberRole = mutation({
  args: { memberId: v.id("teamMembers"), role: workspaceRole },
  handler: async (ctx, args) => {
    const actor = await requirePermission(ctx, "manageTeam");

    const member = await ctx.db.get(args.memberId);
    if (!member) throw new Error("Member not found");

    await ctx.db.patch(args.memberId, { role: args.role });

    await ctx.db.insert("auditLog", {
      actor: actor.name,
      action: "roleChanged",
      target: `${member.name} → ${args.role}`,
      occurredAt: Date.now(),
    });
  },
});

export const removeMember = mutation({
  args: { memberId: v.id("teamMembers") },
  handler: async (ctx, args) => {
    await requirePermission(ctx, "manageTeam");
    await ctx.db.delete(args.memberId);
  },
});
