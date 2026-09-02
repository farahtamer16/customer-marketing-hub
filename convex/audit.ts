import { query } from "./_generated/server";
import { requirePermission } from "./authz";

export const listEntries = query({
  handler: async (ctx) => {
    await requirePermission(ctx, "manageTeam");
    const entries = await ctx.db
      .query("auditLog")
      .withIndex("by_occurredAt")
      .order("desc")
      .collect();
    return entries.map((entry) => ({ id: entry._id, ...entry }));
  },
});
