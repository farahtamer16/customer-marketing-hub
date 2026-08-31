import { auth } from "@clerk/nextjs/server";
import { fetchMutation } from "convex/nextjs";
import { NextRequest, NextResponse } from "next/server";
import { api } from "@/convex/_generated/api";

const GRAPH_VERSION = "v21.0";
const GRAPH_URL = `https://graph.facebook.com/${GRAPH_VERSION}`;

function redirectWithError(request: NextRequest, message: string) {
  const url = new URL("/connect/social-accounts", request.url);
  url.searchParams.set("meta_error", message);
  return NextResponse.redirect(url);
}

export async function GET(request: NextRequest) {
  const { userId, getToken } = await auth();
  if (!userId) {
    return NextResponse.redirect(new URL("/sign-in", request.url));
  }

  const code = request.nextUrl.searchParams.get("code");
  const state = request.nextUrl.searchParams.get("state");
  const expectedState = request.cookies.get("meta_oauth_state")?.value;
  if (!code || !state || !expectedState || state !== expectedState) {
    return redirectWithError(request, "Invalid or expired connection request. Please try again.");
  }

  const appId = process.env.META_APP_ID;
  const appSecret = process.env.META_APP_SECRET;
  if (!appId || !appSecret) {
    return redirectWithError(request, "Meta app credentials are not configured on the server.");
  }

  try {
    const redirectUri = new URL("/api/meta/oauth/callback", request.url).toString();

    const shortLived = await fetch(
      `${GRAPH_URL}/oauth/access_token?client_id=${appId}&redirect_uri=${encodeURIComponent(redirectUri)}&client_secret=${appSecret}&code=${code}`,
    ).then((r) => r.json());
    if (shortLived.error) throw new Error(shortLived.error.message);

    const longLived = await fetch(
      `${GRAPH_URL}/oauth/access_token?grant_type=fb_exchange_token&client_id=${appId}&client_secret=${appSecret}&fb_exchange_token=${shortLived.access_token}`,
    ).then((r) => r.json());
    if (longLived.error) throw new Error(longLived.error.message);

    const pages = await fetch(
      `${GRAPH_URL}/me/accounts?fields=id,name,access_token,instagram_business_account{id,username}&access_token=${longLived.access_token}`,
    ).then((r) => r.json());
    if (pages.error) throw new Error(pages.error.message);

    const page = pages.data?.[0];
    if (!page) {
      return redirectWithError(
        request,
        "No Facebook Page found. You need to be an admin of at least one Facebook Page to connect.",
      );
    }

    const token = (await getToken({ template: "convex" })) ?? undefined;

    await fetchMutation(
      api.socialAccounts.connectMetaAccount,
      {
        platform: "Facebook",
        accountName: page.name,
        accountHandle: page.name,
        platformAccountId: page.id,
        accessToken: page.access_token,
      },
      { token },
    );

    if (page.instagram_business_account) {
      await fetchMutation(
        api.socialAccounts.connectMetaAccount,
        {
          platform: "Instagram",
          accountName: page.instagram_business_account.username ?? page.name,
          accountHandle: page.instagram_business_account.username ?? page.name,
          platformAccountId: page.instagram_business_account.id,
          accessToken: page.access_token,
        },
        { token },
      );
    }

    const url = new URL("/connect/social-accounts", request.url);
    url.searchParams.set("meta_connected", "1");
    const response = NextResponse.redirect(url);
    response.cookies.delete("meta_oauth_state");
    return response;
  } catch (error) {
    return redirectWithError(
      request,
      error instanceof Error ? error.message : "Failed to connect to Meta.",
    );
  }
}
