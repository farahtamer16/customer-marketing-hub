import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "crypto";

const META_OAUTH_SCOPES = [
  "pages_show_list",
  "pages_read_engagement",
  "pages_manage_posts",
  "pages_manage_metadata",
  "read_insights",
  // Read the actual text of comments/posts other people left on the Page
  // (pages_read_engagement alone only covers the Page's own content and
  // metadata). Also a required dependency of pages_manage_engagement below.
  "pages_read_user_content",
  // Publish/edit/delete comments on the Page's own posts — confirmed via
  // Meta's permissions reference; requesting it without its
  // pages_read_user_content dependency in the same call gets the whole
  // OAuth request rejected as "Invalid Scopes".
  "pages_manage_engagement",
  "instagram_basic",
  "instagram_content_publish",
  "instagram_manage_comments",
  "business_management",
].join(",");

export async function GET(request: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.redirect(new URL("/sign-in", request.url));
  }

  const appId = process.env.META_APP_ID;
  if (!appId) {
    return NextResponse.json(
      { error: "META_APP_ID is not configured on the server" },
      { status: 500 },
    );
  }

  const state = randomBytes(24).toString("hex");
  const redirectUri = new URL("/api/meta/oauth/callback", request.url).toString();

  const authorizeUrl = new URL("https://www.facebook.com/v21.0/dialog/oauth");
  authorizeUrl.searchParams.set("client_id", appId);
  authorizeUrl.searchParams.set("redirect_uri", redirectUri);
  authorizeUrl.searchParams.set("state", state);
  authorizeUrl.searchParams.set("scope", META_OAUTH_SCOPES);
  authorizeUrl.searchParams.set("response_type", "code");

  const response = NextResponse.redirect(authorizeUrl.toString());
  response.cookies.set("meta_oauth_state", state, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    maxAge: 600,
    path: "/",
  });
  return response;
}
