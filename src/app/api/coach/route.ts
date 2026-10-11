import { providerError } from "../../../lib/gemini-diagnostics";
import { geminiApiKeys, shouldRotateGeminiKey } from "../../../lib/gemini-keys";
import { NextResponse } from "next/server";
import {
  coachPrompt,
  coachRequestSchema,
  parseGroundedCoachResponse,
} from "../../../lib/coach";

export const runtime = "nodejs";
export const maxDuration = 60;

const responseJsonSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    headline: { type: "string", minLength: 1, maxLength: 120 },
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
          text: { type: "string", minLength: 1, maxLength: 320 },
        },
        required: ["metricId", "text"],
      },
    },
    caveat: { type: "string", minLength: 1, maxLength: 240 },
  },
  required: ["headline", "explanations", "caveat"],
} as const;

export async function POST(request: Request) {
  const keys = geminiApiKeys();
  if (!keys.length)
    return NextResponse.json(
      { error: "Gemini is not configured. Please contact the app owner." },
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
  let failure = "response";
  let diagnostics: unknown = null;
  // Retry one temporary upstream failure; never return a fabricated AI explanation.
  for (const key of keys) for (let attempt = 0; attempt < 2; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 25000);
    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
        {
          method: "POST",
          headers: { "content-type": "application/json", "x-goog-api-key": key },
          body: JSON.stringify({
            contents: [{ parts: [{ text: coachPrompt(input) }] }],
            generationConfig: {
              temperature: 0.2,
              maxOutputTokens: 2048,
              ...(model.startsWith("gemini-2.5-flash") ? { thinkingConfig: { thinkingBudget: 0 } } : {}),
              responseMimeType: "application/json",
              responseJsonSchema,
            },
          }),
          signal: controller.signal,
          cache: "no-store",
        },
      );
      if (!response.ok) {
        failure = `upstream-${response.status}`;
        diagnostics = await providerError(response, model, key, attempt);
        console.warn("Gemini comparison failed", { status: response.status, attempt });
        if (shouldRotateGeminiKey(response.status)) break;
        if (attempt === 0 && response.status >= 500) continue;
        return NextResponse.json({ error: "Gemini could not complete this comparison. Please try again.", diagnostics }, { status: 502 });
      }
      const result = await response.json();
      const parts = result?.candidates?.[0]?.content?.parts;
      const text = Array.isArray(parts)
        ? parts.filter((part: { text?: unknown; thought?: boolean }) => !part.thought && typeof part.text === "string").map((part: { text: string }) => part.text).join("")
        : "";
      if (!text) throw new Error("empty");
      const grounded = parseGroundedCoachResponse(JSON.parse(text), input.evidence.map((item) => item.metricId));
      return NextResponse.json(grounded);
    } catch {
      diagnostics = null;
      failure = controller.signal.aborted ? "timeout" : "response";
      console.warn("Gemini comparison failed", { reason: failure, attempt });
    } finally {
      clearTimeout(timer);
    }
  }
  const error = failure === "upstream-429"
    ? "Gemini has reached its request limit. Please try again in a minute."
    : failure === "timeout"
      ? "Gemini took too long to respond. Please try again."
      : failure === "upstream-400" || failure === "upstream-401" || failure === "upstream-403" || failure === "upstream-404"
        ? "Gemini could not connect with the current app configuration. Please contact the app owner."
        : "Gemini could not complete this comparison. Please try again.";
  return NextResponse.json({ error, diagnostics: diagnostics ?? { source: "Menhel", reason: failure, model, timeoutMs: 25000, attempts: 2 } }, { status: 502 });
}
