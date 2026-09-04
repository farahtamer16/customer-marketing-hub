import { action, internalMutation, internalQuery, query } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import { requirePermission } from "./authz";

// Reuses the canonical permission table in authz.ts rather than duplicating
// it — an internalQuery so an action (which has no ctx.db of its own) can
// still run the same check via ctx.runQuery, with identity propagating
// through since this is a direct call, not a scheduled one.
export const checkSendPermission = internalQuery({
  handler: async (ctx) => {
    await requirePermission(ctx, "manageLeads");
  },
});

export const getAccountForSend = internalQuery({
  args: { accountId: v.id("growthAccounts") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.accountId);
  },
});

export const logSent = internalMutation({
  args: {
    accountId: v.id("growthAccounts"),
    memberId: v.string(),
    toEmail: v.string(),
    subject: v.string(),
    body: v.string(),
    sentBy: v.string(),
    resendId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("outreachEmails", { ...args, sentAt: Date.now() });
  },
});

// Real send, human-reviewed: the caller has already generated and edited
// the draft in PersonalizeOutreachDialog and clicked Send themselves — this
// is never triggered automatically by a score change or a cron. Only sends
// to a real buying-group member's email already on file for this account,
// never an arbitrary address.
export const sendOutreachEmail = action({
  args: {
    accountId: v.id("growthAccounts"),
    memberId: v.string(),
    subject: v.string(),
    body: v.string(),
  },
  handler: async (ctx, args): Promise<{ success: true }> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    await ctx.runQuery(internal.outreach.checkSendPermission, {});

    const account = await ctx.runQuery(internal.outreach.getAccountForSend, {
      accountId: args.accountId,
    });
    if (!account) throw new Error("Account not found");
    const member = account.members.find((m) => m.id === args.memberId);
    if (!member || !member.email) {
      throw new Error("This person doesn't have an email on file");
    }

    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      throw new Error(
        "Email sending isn't configured yet — RESEND_API_KEY is missing.",
      );
    }
    const fromAddress = process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev";

    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: fromAddress,
        to: member.email,
        subject: args.subject,
        text: args.body,
      }),
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || `Resend request failed (${response.status})`);
    }

    await ctx.runMutation(internal.outreach.logSent, {
      accountId: args.accountId,
      memberId: args.memberId,
      toEmail: member.email,
      subject: args.subject,
      body: args.body,
      sentBy: identity.subject,
      resendId: typeof data.id === "string" ? data.id : undefined,
    });

    return { success: true };
  },
});

// Real send history for an account — what the "last contacted" line on the
// account profile reads from.
export const listForAccount = query({
  args: { accountId: v.id("growthAccounts") },
  handler: async (ctx, args) => {
    await requirePermission(ctx, "manageLeads");
    return await ctx.db
      .query("outreachEmails")
      .withIndex("by_accountId", (q) => q.eq("accountId", args.accountId))
      .order("desc")
      .collect();
  },
});
