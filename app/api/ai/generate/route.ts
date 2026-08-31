import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({
  apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY!,
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      topic,
      tone = "engaging",
      platform = "social media",
      length = "short",
      type = "post",
      variations = 3,
    } = body;

    if (!topic) {
      return NextResponse.json(
        { error: "Missing topic field" },
        { status: 400 },
      );
    }

    const prompt = `
Generate ${variations} different ${length} ${tone} ${type === "comment" ? "comments/replies" : "social media posts"} about "${topic}" for ${platform}.

Each variation should be unique and have a different angle.
Return exactly ${variations} variations, numbered 1 to ${variations}, each on its own line, with a clear separation.
Format:
1. [first variation]
2. [second variation]
3. [third variation]

Do not include any extra text, introductions, or conclusions. Only the numbered list.
`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash-lite",
      contents: [{ text: prompt }],
      config: { httpOptions: { timeout: 20_000 } },
    });

    const text = response.text?.trim();
    if (!text) {
      throw new Error("No content generated.");
    }

    const captions: string[] = [];
    const lines = text.split("\n");
    for (const line of lines) {
      const match = line.match(/^\s*\d+\.\s*(.*)/);
      if (match && match[1]) {
        captions.push(match[1].trim());
      }
    }

    if (captions.length < variations) {
      const parts = text.split(/\n\s*\n/);
      if (parts.length >= variations) {
        captions.length = 0;
        for (let i = 0; i < variations; i++) {
          if (parts[i]) captions.push(parts[i].trim());
        }
      }
    }

    if (captions.length === 0) {
      captions.push(text);
    }

    return NextResponse.json({ success: true, captions });
  } catch (error: any) {
    console.error("AI generation error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to generate content" },
      { status: 500 },
    );
  }
}
