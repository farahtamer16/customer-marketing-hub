import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({
  apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY!,
});

function truncate(value: unknown, max: number): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function toCount(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? Math.round(value) : 0;
}

// A short, grounded explanation of why a post performed the way it did —
// built only from the post's real, already-collected metrics and comment
// classifications (passed from PostAnalytics, which has this on screen
// already). Never given anything to invent numbers from.
export async function POST(req: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const content = truncate(body.content, 300);
  const platform = truncate(body.platform, 40);
  if (!platform) {
    return NextResponse.json({ error: "Missing post context" }, { status: 400 });
  }

  const likes = toCount(body.likes);
  const comments = toCount(body.comments);
  const shares = toCount(body.shares);
  const reach = body.reach === undefined ? null : toCount(body.reach);
  const impressions = body.impressions === undefined ? null : toCount(body.impressions);
  const engagementRate =
    typeof body.engagementRate === "number" && Number.isFinite(body.engagementRate)
      ? body.engagementRate
      : null;

  const breakdown =
    body.commentBreakdown && typeof body.commentBreakdown === "object"
      ? (body.commentBreakdown as Record<string, unknown>)
      : {};
  const breakdownLines = Object.entries(breakdown)
    .map(([category, count]) => `${category}: ${toCount(count)}`)
    .filter((line) => !line.endsWith(": 0"))
    .join(", ");

  const prompt = `You are a social media analyst. Write a short (under 60 words), grounded observation about why this post performed the way it did, based ONLY on the real numbers below. Do not invent facts, audience details, or numbers not given. If the numbers are too sparse to say anything meaningful, say that plainly instead of guessing.

Platform: ${platform}
Post content: ${content || "(no caption)"}
Likes: ${likes}
Comments: ${comments}
Shares: ${shares}
Reach: ${reach === null ? "not available" : reach}
Impressions: ${impressions === null ? "not available" : impressions}
Engagement rate: ${engagementRate === null ? "not available" : `${(engagementRate * 100).toFixed(1)}%`}
Comment breakdown: ${breakdownLines || "no classified comments yet"}

Return plain text only, no markdown, no headers.`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash-lite",
      contents: [{ text: prompt }],
      config: { httpOptions: { timeout: 20_000 } },
    });

    const insight = response.text?.trim();
    if (!insight) throw new Error("No insight generated.");

    return NextResponse.json({ success: true, insight });
  } catch (error) {
    console.error(
      "[post-insight] Error:",
      error instanceof Error ? error.message : error,
    );
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to generate insight",
      },
      { status: 500 },
    );
  }
}
