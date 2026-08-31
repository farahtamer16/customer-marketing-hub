import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({
  apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY!,
});

const CATEGORIES = ["Lead", "Question", "Complaint", "Feedback", "Engagement", "Other"];
const CATEGORY_PATTERN = new RegExp(CATEGORIES.join("|"), "gi");
const MAX_BATCH = 100;
const MAX_TEXT_LENGTH = 400;

function normalizeCategory(raw: unknown): string {
  if (typeof raw !== "string") return "Other";
  const cleaned = raw.replace(/[^a-zA-Z]/g, "").toLowerCase();
  return CATEGORIES.find((c) => c.toLowerCase() === cleaned) ?? "Other";
}

export async function POST(req: NextRequest) {
  let texts: string[] = [];
  try {
    const body = await req.json();
    if (typeof body.text === "string") {
      texts = [body.text];
    } else if (Array.isArray(body.texts)) {
      texts = body.texts.filter((t: unknown) => typeof t === "string");
    }
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (texts.length === 0) {
    return NextResponse.json({ error: "Missing text" }, { status: 400 });
  }

  const batch = texts
    .slice(0, MAX_BATCH)
    .map((t) => t.trim().slice(0, MAX_TEXT_LENGTH))
    .filter((t) => t.length > 0);

  if (batch.length === 0) {
    return NextResponse.json({
      classifications: texts.map(() => "Other"),
    });
  }

  const numbered = batch.map((t, i) => `${i + 1}. "${t}"`).join("\n");
  console.log(`[classify] Batch size: ${batch.length}`);

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash-lite",
      contents: [
        {
          text: `Classify each numbered comment below into exactly ONE category: ${CATEGORIES.join(", ")}.

Category definitions:
- Lead: Expresses interest in a product/service.
- Question: Asks a question.
- Complaint: Expresses dissatisfaction.
- Feedback: Provides constructive opinion.
- Engagement: General interaction (thanks, agreement, emoji, short reactions).
- Other: None of the above.

Return ONLY a JSON array of category strings, one entry per comment, in the same order as the comments. No explanations, no markdown formatting.

Comments:
${numbered}`,
        },
      ],
      config: { httpOptions: { timeout: 20_000 } },
    });

    let raw = response.text?.trim() || "[]";
    raw = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");

    let parsed: unknown[];
    try {
      parsed = JSON.parse(raw);
    } catch {
      parsed = raw.match(CATEGORY_PATTERN) ?? [];
    }

    const classifications = Array.from({ length: batch.length }, (_, i) =>
      normalizeCategory((parsed as unknown[])[i])
    );

    console.log("[classify] Result:", classifications.join(","));
    return NextResponse.json({ classifications });
  } catch (error: any) {
    console.error("[classify] Error (degrading to Other):", error?.message || error);
    return NextResponse.json(
      { classifications: batch.map(() => "Other"), degraded: true },
      { status: 200 }
    );
  }
}
