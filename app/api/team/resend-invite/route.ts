import { auth, clerkClient } from "@clerk/nextjs/server";
import { fetchAction, fetchQuery } from "convex/nextjs";
import { NextRequest, NextResponse } from "next/server";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { generateTempPassword } from "../tempPassword";

type ResendInviteRequest = {
  memberId?: unknown;
};

// There's no separate "pending invite" record to resend — the real Clerk
// account already exists from the moment an admin creates the member (see
// create-member/route.ts). "Resend" here means: assign them a fresh
// temporary password (the original one was never stored anywhere to look
// up again) and re-send the invite email with it, for a member who lost
// the first email or never got it.
export async function POST(req: NextRequest) {
  const { userId, getToken } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: ResendInviteRequest;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { memberId } = body;
  if (typeof memberId !== "string" || !memberId) {
    return NextResponse.json({ error: "Member is required" }, { status: 400 });
  }

  const token = (await getToken({ template: "convex" })) ?? undefined;

  // getMemberDetail is already gated by manageTeam, so this doubles as the
  // permission check before Clerk's password is touched.
  let clerkUserId: string | null;
  try {
    const member = await fetchQuery(
      api.team.getMemberDetail,
      { memberId: memberId as Id<"teamMembers"> },
      { token },
    );
    if (!member) {
      return NextResponse.json({ error: "Member not found" }, { status: 404 });
    }
    clerkUserId = member.clerkUserId;
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Not permitted" },
      { status: 403 },
    );
  }

  if (!clerkUserId) {
    return NextResponse.json(
      { error: "This member has no account to resend an invite to" },
      { status: 400 },
    );
  }

  const password = generateTempPassword();
  try {
    const client = await clerkClient();
    await client.users.updateUser(clerkUserId, { password });
  } catch (error) {
    const message =
      error && typeof error === "object" && "errors" in error
        ? ((error as { errors?: Array<{ message?: string }> }).errors?.[0]?.message ??
            "Could not reset the account's password")
        : "Could not reset the account's password";
    return NextResponse.json({ error: message }, { status: 500 });
  }

  const emailResult = await fetchAction(
    api.teams.sendInviteEmail,
    { memberId: memberId as Id<"teamMembers">, temporaryPassword: password },
    { token },
  ).catch((error) => ({
    sent: false as const,
    error: error instanceof Error ? error.message : "Could not send the invite email",
  }));

  return NextResponse.json({
    temporaryPassword: password,
    emailSent: emailResult.sent,
    emailError: emailResult.sent ? undefined : emailResult.error,
  });
}
