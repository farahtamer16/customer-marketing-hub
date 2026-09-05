import { randomBytes } from "crypto";
import { auth, clerkClient } from "@clerk/nextjs/server";
import { fetchMutation } from "convex/nextjs";
import { NextRequest, NextResponse } from "next/server";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";

type CreateMemberRequest = {
  name?: unknown;
  email?: unknown;
  role?: unknown;
  teamId?: unknown;
};

const ROLES = ["ownerAdmin", "cmo", "marketingManager", "socialMediaUser"] as const;

// Excludes visually-confusable characters (0/O, 1/l/I) — this gets typed
// or copy-pasted by hand since there's no invite-email system wired up yet.
const PASSWORD_CHARSET = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";

function generateTempPassword() {
  // Math.random().toString(36) does NOT reliably produce a fixed-length
  // string — JS drops trailing zero bits in the float→string conversion,
  // so slice(2, 10) could silently come back shorter than 8 characters,
  // intermittently landing under Clerk's minimum password length and
  // getting the whole request rejected. Drawing from crypto.randomBytes
  // into a fixed-size loop guarantees the real length every time.
  const bytes = randomBytes(12);
  let random = "";
  for (const byte of bytes) {
    random += PASSWORD_CHARSET[byte % PASSWORD_CHARSET.length];
  }
  // Fixed prefix/suffix guarantee upper/lower/symbol/digit are all present
  // regardless of what the random draw contains.
  return `Sp!${random}9`;
}

export async function POST(req: NextRequest) {
  const { userId, getToken } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: CreateMemberRequest;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { name, email, role, teamId } = body;
  if (typeof name !== "string" || !name.trim()) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }
  if (typeof email !== "string" || !email.trim()) {
    return NextResponse.json({ error: "Email is required" }, { status: 400 });
  }
  if (typeof role !== "string" || !ROLES.includes(role as (typeof ROLES)[number])) {
    return NextResponse.json({ error: "Invalid role" }, { status: 400 });
  }
  if (teamId !== undefined && typeof teamId !== "string") {
    return NextResponse.json({ error: "Invalid team" }, { status: 400 });
  }

  const token = (await getToken({ template: "convex" })) ?? undefined;

  try {
    // Checked before touching Clerk so a non-admin's request never gets as
    // far as creating a real account.
    await fetchMutation(api.teams.assertCanManageTeam, {}, { token });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Not permitted" },
      { status: 403 },
    );
  }

  const password = generateTempPassword();
  let clerkUserId: string;
  try {
    const client = await clerkClient();
    const user = await client.users.createUser({
      emailAddress: [email],
      password,
      firstName: name,
    });
    clerkUserId = user.id;
  } catch (error) {
    const message =
      error && typeof error === "object" && "errors" in error
        ? // Clerk's own validation errors (e.g. duplicate email) are safe to relay.
          ((error as { errors?: Array<{ message?: string }> }).errors?.[0]?.message ??
            "Could not create the account")
        : "Could not create the account";
    return NextResponse.json({ error: message }, { status: 422 });
  }

  try {
    const memberId = await fetchMutation(
      api.teams.createTeamMember,
      {
        name,
        email,
        role: role as (typeof ROLES)[number],
        clerkUserId,
        teamId: teamId as Id<"teams"> | undefined,
      },
      { token },
    );
    return NextResponse.json({ memberId, temporaryPassword: password });
  } catch (error) {
    // The real Clerk account exists but the workspace row failed (e.g. a
    // race on the email uniqueness check) — remove it rather than leaving
    // a login with no workspace membership.
    const client = await clerkClient();
    await client.users.deleteUser(clerkUserId).catch(() => {});
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not add member" },
      { status: 500 },
    );
  }
}
