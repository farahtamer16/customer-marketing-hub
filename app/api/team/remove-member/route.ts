import { auth, clerkClient } from "@clerk/nextjs/server";
import { fetchMutation, fetchQuery } from "convex/nextjs";
import { NextRequest, NextResponse } from "next/server";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";

type RemoveMemberRequest = {
  memberId?: unknown;
};

export async function POST(req: NextRequest) {
  const { userId, getToken } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: RemoveMemberRequest;
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
  // permission check before anything is deleted.
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

  // A member who never signed in has no real Clerk account to clean up —
  // just an invited placeholder row.
  if (clerkUserId) {
    try {
      const client = await clerkClient();
      await client.users.deleteUser(clerkUserId);
    } catch (error) {
      // Already-deleted (e.g. removed directly in Clerk earlier) shouldn't
      // block removing the workspace row — anything else is a real failure
      // worth surfacing instead of silently leaving the login behind.
      const isNotFound =
        error && typeof error === "object" && "status" in error && error.status === 404;
      if (!isNotFound) {
        return NextResponse.json(
          { error: "Could not delete the account. Try again." },
          { status: 500 },
        );
      }
    }
  }

  try {
    await fetchMutation(
      api.team.removeMember,
      { memberId: memberId as Id<"teamMembers"> },
      { token },
    );
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not remove member" },
      { status: 500 },
    );
  }

  return NextResponse.json({ success: true });
}
