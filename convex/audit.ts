import { query } from "./_generated/server";
import { requirePermission } from "./authz";

export const listEntries = query({
  handler: async (ctx) => {
    const actor = await requirePermission(ctx, "manageTeam");
    const entries = await ctx.db
      .query("auditLog")
      .withIndex("by_workspaceId_occurredAt", (q) => q.eq("workspaceId", actor.workspaceId))
      .order("desc")
      .collect();
    return entries.map((entry) => ({ id: entry._id, ...entry }));
  },
});
