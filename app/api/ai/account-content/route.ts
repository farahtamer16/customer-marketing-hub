import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({
  apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY!,
});

function truncate(value: unknown, max: number): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function toScore(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value)
    ? Math.round(value)
    : 0;
}

interface MemberInput {
  title?: unknown;
  role?: unknown;
}

// Personalized outreach content for a real B2B growth account — grounded
// only in the account's actual stage/scores/signals/buying-group roles
// (passed from AccountProfile, which already has this data on screen), the
// same "real data in, no fabricated facts" pattern as the rest of the
// growth hub. Nothing is sent; this only drafts a copyable email.
export async function POST(req: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const name = truncate(body.name, 120);
  const industry = truncate(body.industry, 80);
  const tier = truncate(body.tier, 40);
  const stage = truncate(body.stage, 40);
  const nextAction = truncate(body.nextAction, 60);
  if (!name || !stage || !nextAction) {
    return NextResponse.json(
      { error: "Missing account context" },
      { status: 400 },
    );
  }

  const intentScore = toScore(body.intentScore);
  const engagementScore = toScore(body.engagementScore);
  const adoptionScore = toScore(body.adoptionScore);

  const membersRaw = Array.isArray(body.members)
    ? (body.members as MemberInput[])
    : [];
  const members = membersRaw
    .slice(0, 8)
    .map((member) => ({
      title: truncate(member?.title, 80),
      role: truncate(member?.role, 40),
    }))
    .filter((member) => member.title || member.role);

  const recentSignalsRaw = Array.isArray(body.recentSignalKinds)
    ? body.recentSignalKinds
    : [];
  const recentSignals = recentSignalsRaw
    .slice(0, 5)
    .map((signal) => truncate(signal, 40))
    .filter(Boolean);

  const prompt = `You are a B2B growth marketer writing a short, personalized outreach email to a named account, grounded ONLY in the real facts given below. Do not invent facts, numbers, or people that aren't listed.

Account: ${name}
Industry: ${industry || "unknown"}
Company tier: ${tier || "unknown"}
Lifecycle stage: ${stage}
Intent score (0-100): ${intentScore}
Engagement score (0-100): ${engagementScore}
Adoption score (0-100): ${adoptionScore}
Recommended next action: ${nextAction}
${
  members.length
    ? `Known buying-group roles: ${members
        .map((member) => `${member.role || "contact"}${member.title ? ` (${member.title})` : ""}`)
        .join(", ")}`
    : "No known buying-group contacts yet."
}
${
  recentSignals.length
    ? `Recent real activity: ${recentSignals.join(", ")}`
    : "No recent activity logged."
}

Write a concise outreach email (under 120 words in the body) that references their actual stage and activity, and drives toward the recommended next action. Return ONLY valid JSON: {"subject": "...", "body": "..."}. No markdown, no extra text.`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash-lite",
      contents: [{ text: prompt }],
      config: { httpOptions: { timeout: 20_000 } },
    });

    let raw = response.text?.trim() || "";
    raw = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");

    let subject = "";
    let content = "";
    try {
      const parsed: unknown = JSON.parse(raw);
      if (parsed && typeof parsed === "object") {
        const record = parsed as Record<string, unknown>;
        subject = typeof record.subject === "string" ? record.subject.trim() : "";
        content = typeof record.body === "string" ? record.body.trim() : "";
      }
    } catch {
      content = raw;
    }

    if (!content) throw new Error("No content generated.");
    if (!subject) subject = `Following up, ${name}`;

    return NextResponse.json({ success: true, subject, body: content });
  } catch (error) {
    console.error(
      "[account-content] Error:",
      error instanceof Error ? error.message : error,
    );
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to generate content",
      },
      { status: 500 },
    );
  }
}
