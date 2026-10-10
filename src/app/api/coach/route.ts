import { NextResponse } from "next/server";
import {
  coachPrompt,
  coachRequestSchema,
  parseGroundedCoachResponse,
} from "@/lib/coach";

export const runtime = "nodejs";

const responseJsonSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    headline: { type: "string" },
    explanations: {
      type: "array",
      minItems: 1,
      maxItems: 3,
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          metricId: {
            type: "string",
            enum: [
              "set-tracking-coverage",
              "median-peak-knee",
              "median-ascent-duration",
              "knee-peak-mad",
            ],
          },
          text: { type: "string" },
        },
        required: ["metricId", "text"],
      },
    },
    caveat: { type: "string" },
  },
  required: ["headline", "explanations", "caveat"],
} as const;

export async function POST(request: Request) {
  const key = process.env.GEMINI_API_KEY;
  if (!key)
    return NextResponse.json(
      { error: "The optional Gemini coach is not configured." },
      { status: 503 },
    );

  let input;
  try {
    input = coachRequestSchema.parse(await request.json());
  } catch {
    return NextResponse.json(
      { error: "The measurement summary is invalid." },
      { status: 400 },
    );
  }

  const model = process.env.GEMINI_MODEL ?? "gemini-2.5-flash";
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12000);
  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-goog-api-key": key,
        },
        body: JSON.stringify({
          contents: [{ parts: [{ text: coachPrompt(input) }] }],
          generationConfig: {
            temperature: 0.2,
            responseMimeType: "application/json",
            responseJsonSchema,
          },
        }),
        signal: controller.signal,
        cache: "no-store",
      },
    );
    if (!response.ok) throw new Error("Gemini request failed");
    const result = await response.json();
    const text = result?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (typeof text !== "string") throw new Error("Gemini response was empty");
    const grounded = parseGroundedCoachResponse(
      JSON.parse(text),
      input.evidence.map((item) => item.metricId),
    );
    return NextResponse.json(grounded);
  } catch {
    return NextResponse.json(
      {
        error:
          "The optional coach is unavailable. The measurement-based observations above remain available.",
      },
      { status: 502 },
    );
  } finally {
    clearTimeout(timer);
  }
}
