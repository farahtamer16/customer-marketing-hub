import { action, internalMutation, internalQuery, query } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import { requireInWorkspace, requirePermission } from "./authz";

// Resend's open/click tracking works by injecting an invisible pixel/link
// rewrite into the email's HTML body — a text-only send has no HTML for it
// to go into, so opens can never be detected regardless of any dashboard
// setting. Escaped for HTML, with newlines turned into <br> since the
// draft is plain text (from PersonalizeOutreachDialog's textarea).
function toSimpleHtml(body: string): string {
  const escaped = body
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  return `<div>${escaped.split("\n").map((line) => line || "&nbsp;").join("<br>")}</div>`;
}

// Reuses the canonical permission table in authz.ts rather than duplicating
// it — an internalQuery so an action (which has no ctx.db of its own) can
// still run the same check via ctx.runQuery, with identity propagating
// through since this is a direct call, not a scheduled one.
export const checkSendPermission = internalQuery({
  handler: async (ctx) => {
    return await requirePermission(ctx, "manageLeads");
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
    const account = await ctx.db.get(args.accountId);
    if (!account) throw new Error("Account not found");
    await ctx.db.insert("outreachEmails", {
      ...args,
      workspaceId: account.workspaceId,
      sentAt: Date.now(),
    });
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
    const actor = await ctx.runQuery(internal.outreach.checkSendPermission, {});

    const account = await ctx.runQuery(internal.outreach.getAccountForSend, {
      accountId: args.accountId,
    });
    if (!account) throw new Error("Account not found");
    requireInWorkspace(actor, account);
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
        html: toSimpleHtml(args.body),
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

// Higher rank wins on a race between out-of-order webhook deliveries — a
// late "delivered" event should never downgrade an already-recorded
// "opened". bounced/complained rank highest since they're the outcome most
// worth surfacing regardless of what else already happened.
const DELIVERY_STATUS_RANK: Record<string, number> = {
  delivered: 1,
  opened: 2,
  clicked: 3,
  bounced: 4,
  complained: 4,
};

// Called from convex/http.ts's Resend webhook handler — that endpoint has
// already verified the request's svix signature before this ever runs, so
// there's no separate auth check here, same as any other internal-only
// mutation reachable solely from trusted server code.
export const recordEvent = internalMutation({
  args: {
    resendId: v.string(),
    status: v.union(
      v.literal("delivered"),
      v.literal("opened"),
      v.literal("clicked"),
      v.literal("bounced"),
      v.literal("complained"),
    ),
    occurredAt: v.number(),
  },
  handler: async (ctx, args) => {
    const email = await ctx.db
      .query("outreachEmails")
      .withIndex("by_resendId", (q) => q.eq("resendId", args.resendId))
      .unique();
    // Not one of ours (a different Resend project's traffic sharing the
    // same account) or the event beat logSent's own write — either way,
    // nothing to update.
    if (!email) return;

    const currentRank = email.deliveryStatus ? DELIVERY_STATUS_RANK[email.deliveryStatus] : 0;
    if (DELIVERY_STATUS_RANK[args.status] < currentRank) return;

    await ctx.db.patch(email._id, {
      deliveryStatus: args.status,
      deliveryStatusAt: args.occurredAt,
    });
  },
});

// Real send history for an account — what the "last contacted" line on the
// account profile reads from.
export const listForAccount = query({
  args: { accountId: v.id("growthAccounts") },
  handler: async (ctx, args) => {
    const actor = await requirePermission(ctx, "manageLeads");
    const account = await ctx.db.get(args.accountId);
    if (!account) throw new Error("Account not found");
    requireInWorkspace(actor, account);
    return await ctx.db
      .query("outreachEmails")
      .withIndex("by_accountId", (q) => q.eq("accountId", args.accountId))
      .order("desc")
      .collect();
  },
});
