import { httpRouter } from "convex/server";
import { Webhook } from "svix";
import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";

const http = httpRouter();

const DELIVERY_EVENT_TYPES = new Set([
  "email.delivered",
  "email.opened",
  "email.clicked",
  "email.bounced",
  "email.complained",
]);

function extractType(payload: unknown): string | undefined {
  if (typeof payload !== "object" || payload === null) return undefined;
  const type = (payload as Record<string, unknown>).type;
  return typeof type === "string" ? type : undefined;
}

function extractEmailId(payload: unknown): string | undefined {
  if (typeof payload !== "object" || payload === null) return undefined;
  const data = (payload as Record<string, unknown>).data;
  if (typeof data !== "object" || data === null) return undefined;
  const emailId = (data as Record<string, unknown>).email_id;
  return typeof emailId === "string" ? emailId : undefined;
}

// Resend signs delivery-event webhooks (sent/delivered/opened/clicked/
// bounced/complained) via Svix — this is how outreach.ts's "last contacted"
// history learns whether an email actually landed, without any inbound
// email/IMAP setup. Configure the webhook URL (this deployment's HTTP
// Actions URL + /resend-webhook) and RESEND_WEBHOOK_SECRET (the "Signing
// secret" Resend shows for that endpoint) in the Resend dashboard and
// `npx convex env set` respectively — until both are set, this silently
// no-ops rather than rejecting deliveries.
http.route({
  path: "/resend-webhook",
  method: "POST",
  handler: httpAction(async (ctx, req) => {
    const secret = process.env.RESEND_WEBHOOK_SECRET;
    if (!secret) {
      return new Response(null, { status: 200 });
    }

    const svixId = req.headers.get("svix-id");
    const svixTimestamp = req.headers.get("svix-timestamp");
    const svixSignature = req.headers.get("svix-signature");
    if (!svixId || !svixTimestamp || !svixSignature) {
      return new Response("Missing svix headers", { status: 400 });
    }

    const payload = await req.text();
    let event: unknown;
    try {
      new Webhook(secret).verify(payload, {
        "svix-id": svixId,
        "svix-timestamp": svixTimestamp,
        "svix-signature": svixSignature,
      });
      event = JSON.parse(payload);
    } catch {
      return new Response("Invalid signature", { status: 401 });
    }

    const type = extractType(event);
    if (!type || !DELIVERY_EVENT_TYPES.has(type)) {
      return new Response(null, { status: 200 });
    }

    const emailId = extractEmailId(event);
    if (!emailId) {
      return new Response(null, { status: 200 });
    }

    await ctx.runMutation(internal.outreach.recordEvent, {
      resendId: emailId,
      status: type.replace("email.", "") as
        | "delivered"
        | "opened"
        | "clicked"
        | "bounced"
        | "complained",
      occurredAt: Date.now(),
    });

    return new Response(null, { status: 200 });
  }),
});

export default http;
