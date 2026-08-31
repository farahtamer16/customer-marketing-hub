import { query } from "./_generated/server";

export const listEntries = query({
  handler: async (ctx) => {
    const entries = await ctx.db
      .query("auditLog")
      .withIndex("by_occurredAt")
      .order("desc")
      .collect();
    return entries.map((entry) => ({ id: entry._id, ...entry }));
  },
});
