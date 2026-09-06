import { query } from "./_generated/server";
import { requirePermission } from "./authz";

export const listEntries = query({
  handler: async (ctx) => {
    const actor = await requirePermission(ctx, "manageTeam");
    const entries = actor.workspaceId
      ? await ctx.db
          .query("auditLog")
          .withIndex("by_workspaceId_occurredAt", (q) =>
            q.eq("workspaceId", actor.workspaceId),
          )
          .order("desc")
          .collect()
      : await ctx.db
          .query("auditLog")
          .withIndex("by_occurredAt")
          .order("desc")
          .collect();
    return entries.map((entry) => ({ id: entry._id, ...entry }));
  },
});
