import { providerError } from "../../../lib/gemini-diagnostics";
import { NextResponse } from "next/server";
import { helpFacts, helpPrompt, helpRequestSchema, parseHelpResponse, type HelpRequest } from "../../../lib/gemini-help";
export const runtime = "nodejs";
export const maxDuration = 60;
// Best-effort per-instance concurrency cap; provider budgets remain authoritative.
let activeRequests = 0;
export async function POST(request: Request) {
  if (activeRequests >= 3) return NextResponse.json({ error: "Three analyses are already running on this server. Wait for one to finish, then retry.", diagnostics: { source: "SpotOn", reason: "local-concurrency-limit", limit: 3 } }, { status: 429 });
  activeRequests++;
  try { return await respond(request); }
  finally { activeRequests--; }
}
async function respond(request: Request) {
  const key = process.env.GEMINI_API_KEY;
  if (!key) return NextResponse.json({ error: "Gemini is not configured. Please contact the app owner." }, { status: 503 });
  let input: HelpRequest;
  try {
    const text = await request.text();
    if (text.length > 25000) return NextResponse.json({ error: "Choose fewer sets or a shorter question." }, { status: 413 });
    input = helpRequestSchema.parse(JSON.parse(text));
  } catch { return NextResponse.json({ error: "Please check the selected results and question." }, { status: 400 }); }
  const facts = helpFacts(input);
  const responseJsonSchema = {
    type: "object", additionalProperties: false, required: ["sections"],
    properties: { sections: { type: "array", minItems: 1, maxItems: 3, items: {
      type: "object", additionalProperties: false, required: ["kind", "text", "evidenceIds"],
      properties: {
        kind: { type: "string", enum: ["went-well", "next-step", "explanation", "progress", "answer"] },
        text: { type: "string", minLength: 1, maxLength: 600 },
        evidenceIds: { type: "array", minItems: 1, maxItems: 8, items: { type: "string", enum: facts.map((f) => f.id) } },
      },
    } } },
  };
  const model = process.env.GEMINI_MODEL ?? "gemini-2.5-flash";
  let failure = "response";
  let diagnostics: unknown = null;
  for (let attempt = 0; attempt < 2; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 25000);
    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
        method: "POST", headers: { "content-type": "application/json", "x-goog-api-key": key },
        body: JSON.stringify({ contents: [{ parts: [{ text: helpPrompt(input, facts) }] }], generationConfig: {
          temperature: 0.2, maxOutputTokens: 2048,
          ...(model.startsWith("gemini-2.5-flash") ? { thinkingConfig: { thinkingBudget: 0 } } : {}),
          responseMimeType: "application/json", responseJsonSchema,
        } }), signal: controller.signal, cache: "no-store",
      });
      if (!response.ok) {
        failure = `upstream-${response.status}`;
        diagnostics = await providerError(response, model, key, attempt);
        if (attempt === 0 && response.status >= 500) continue;
        break;
      }
      const result = await response.json();
      const parts = result?.candidates?.[0]?.content?.parts;
      const text = Array.isArray(parts) ? parts.filter((p: { text?: unknown; thought?: boolean }) => !p.thought && typeof p.text === "string").map((p: { text: string }) => p.text).join("") : "";
      return NextResponse.json(parseHelpResponse(JSON.parse(text), input));
    } catch {
      diagnostics = null;
      failure = controller.signal.aborted ? "timeout" : "response";
    } finally { clearTimeout(timer); }
  }
  const error = failure === "upstream-429" ? "Gemini is busy. Please try again in a minute."
    : failure === "timeout" ? "Gemini took too long. Please try again."
    : ["upstream-400", "upstream-401", "upstream-403", "upstream-404"].includes(failure) ? "Gemini could not connect. Please contact the app owner."
    : "Gemini could not give a supported answer. Please try again. Your recorded results are still available.";
  return NextResponse.json({ error, diagnostics: diagnostics ?? { source: "SpotOn", reason: failure, model, timeoutMs: 25000, attempts: 2 } }, { status: 502 });
}
