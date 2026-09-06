import { internalMutation, internalQuery, mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import { requireMember, requirePermission } from "./authz";

export const COMMENT_CLASSIFICATIONS = [
  "Lead",
  "Question",
  "Complaint",
  "Feedback",
  "Engagement",
  "Other",
] as const;

// The only way a brand-new, uninvited sign-in gets a workspace: creates a
// real, isolated tenant and makes the caller its owner. Both sign-up paths
// ("set up a workspace" and "join as an individual") call this — neither
// joins a shared workspace, since under multi-tenancy there isn't one to
// join without a real invite. `intent` never changes the caller's actual
// role/permissions (always ownerAdmin of their own new workspace, so they
// can never be locked out of it) — it only sets which dashboard/nav they
// land on by default (team.getMyRole reads dashboardHint first).
export const createWorkspace = mutation({
  args: {
    name: v.string(),
    intent: v.union(v.literal("workspace"), v.literal("individual")),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const name = args.name.trim();
    if (!name) throw new Error("Workspace name is required");

    const existing = await ctx.db
      .query("teamMembers")
      .withIndex("by_clerkUserId", (q) => q.eq("clerkUserId", identity.subject))
      .unique();
    if (existing) throw new Error("You already belong to a workspace");

    const workspaceId = await ctx.db.insert("workspaces", {
      name,
      createdBy: identity.subject,
      createdAt: Date.now(),
    });

    const email = identity.email ?? "";
    const memberId = await ctx.db.insert("teamMembers", {
      clerkUserId: identity.subject,
      workspaceId,
      name: identity.name ?? email ?? "Workspace owner",
      email,
      role: "ownerAdmin",
      status: "active",
      lastActive: Date.now(),
      createdAt: Date.now(),
      dashboardHint: args.intent === "individual" ? "social_media_user" : "admin",
    });

    await ctx.runMutation(internal.seed.seedDemoWorkspace, { workspaceId });

    return { workspaceId, memberId };
  },
});

// One-time migration: every row that predates the multi-tenancy work has
// no workspaceId at all. Creates a single "Workspace 1" and patches every
// existing row across every tenant-data table to point at it, so nothing
// currently in use is orphaned or split up — everyone already using the
// app keeps seeing exactly what they see today. Idempotent: safe to run
// again, it only ever touches rows that still have no workspaceId, and
// reuses "Workspace 1" if one was already created by an earlier run.
// Run once via `npx convex run workspaces:backfillDefaultWorkspace`.
export const backfillDefaultWorkspace = internalMutation({
  args: {},
  handler: async (ctx) => {
    const existingDefault = await ctx.db
      .query("workspaces")
      .filter((q) => q.eq(q.field("name"), "Workspace 1"))
      .first();
    const workspaceId =
      existingDefault?._id ??
      (await ctx.db.insert("workspaces", {
        name: "Workspace 1",
        createdBy: "migration",
        createdAt: Date.now(),
      }));

    const counts: Record<string, number> = {};

    async function backfillTable<TableName extends string>(table: TableName) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const rows = await (ctx.db as any).query(table).collect();
      let patched = 0;
      for (const row of rows) {
        if (!row.workspaceId) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          await (ctx.db as any).patch(row._id, { workspaceId });
          patched += 1;
        }
      }
      counts[table] = patched;
    }

    for (const table of [
      "teamMembers",
      "teams",
      "teamTasks",
      "growthAccounts",
      "campaigns",
      "posts",
      "analytics",
      "comments",
      "socialAccounts",
      "approvalPosts",
      "journeySteps",
      "workspaceNotifications",
      "auditLog",
      "outreachEmails",
      "followUpTasks",
    ]) {
      await backfillTable(table);
    }

    return { workspaceId, patched: counts };
  },
});

const DEFAULT_AUTO_REPLY = { enabled: false, classifications: [] as string[] };

// Any workspace member can see the current setting (it explains why a
// comment might have gotten an AI reply); only manageWorkspace can change
// it — same tier as other workspace-wide toggles, not a per-team setting.
export const getAutoReplySettings = query({
  handler: async (ctx) => {
    const actor = await requireMember(ctx);
    const workspace = await ctx.db.get(actor.workspaceId);
    return workspace?.autoReply ?? DEFAULT_AUTO_REPLY;
  },
});

export const updateAutoReplySettings = mutation({
  args: {
    enabled: v.boolean(),
    classifications: v.array(
      v.union(...COMMENT_CLASSIFICATIONS.map((value) => v.literal(value))),
    ),
  },
  handler: async (ctx, args) => {
    const actor = await requirePermission(ctx, "manageWorkspace");
    // De-dupe defensively — a duplicate entry would just mean the same
    // classification check runs twice for no reason, not a real bug, but
    // there's no reason to store it that way.
    const classifications = Array.from(new Set(args.classifications));
    await ctx.db.patch(actor.workspaceId, {
      autoReply: { enabled: args.enabled, classifications },
    });
  },
});

// Internal-only: no identity in autoReply.ts's system-triggered context
// (it runs off a comment being stored, not a signed-in request).
export const getAutoReplySettingsInternal = internalQuery({
  args: { workspaceId: v.id("workspaces") },
  handler: async (ctx, args) => {
    const workspace = await ctx.db.get(args.workspaceId);
    return workspace?.autoReply ?? DEFAULT_AUTO_REPLY;
  },
});
