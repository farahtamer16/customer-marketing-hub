import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { createClerkClient } from "@clerk/backend";

export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { newEmail, currentPassword } = await req.json();
    if (!newEmail || !currentPassword) {
      return NextResponse.json(
        { error: "Missing email or password" },
        { status: 400 },
      );
    }

    const clerk = createClerkClient({
      secretKey: process.env.CLERK_SECRET_KEY!,
    });

    const valid = await clerk.users.verifyPassword({
      userId,
      password: currentPassword,
    });

    if (!valid) {
      return NextResponse.json({ error: "Invalid password" }, { status: 400 });
    }

    const user = await clerk.users.getUser(userId);

    const existing = user.emailAddresses.find(
      (ea) => ea.emailAddress.toLowerCase() === newEmail.toLowerCase(),
    );

    if (existing) {
      const status = existing.verification?.status;
      if (status === "verified") {
        return NextResponse.json(
          { error: "Email already in use", code: "EMAIL_EXISTS" },
          { status: 422 },
        );
      }

      if (status === "unverified") {
        await clerk.emailAddresses.updateEmailAddress(existing.id, {
          verified: true,
        });

        await clerk.users.updateUser(userId, {
          primaryEmailAddressID: existing.id,
        });

        return NextResponse.json({ success: true });
      }

      return NextResponse.json(
        { error: "Email address status is invalid" },
        { status: 422 },
      );
    }

    const created = await clerk.emailAddresses.createEmailAddress({
      userId,
      emailAddress: newEmail,
      verified: true,
    });

    await clerk.users.updateUser(userId, {
      primaryEmailAddressID: created.id,
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("API error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 },
    );
  }
}
