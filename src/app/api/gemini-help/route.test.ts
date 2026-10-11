import { afterEach, expect, it, vi } from "vitest";
import { POST } from "./route";
const body = { mode: "question", question: "What does this tell me?", sets: [{ completedReps: 0, trackingCoverage: 0.5, medianKneeBend: null, medianAscentMs: null, posture: [] }] };
const answer = { sections: [{ kind: "answer", text: "The camera could not see enough of your movement.", evidenceIds: ["set-1-visibility"] }] };
function request(value: unknown = body) { return new Request("http://localhost/api/gemini-help", { method: "POST", body: JSON.stringify(value) }); }
function upstream(value = answer) { return new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: JSON.stringify(value) }] } }] })); }
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });
it("validates inputs before calling Gemini", async () => {
  vi.stubEnv("GEMINI_API_KEY", "test-only");
  const fetcher = vi.fn(); vi.stubGlobal("fetch", fetcher);
  expect((await POST(request({ ...body, video: "no" }))).status).toBe(400);
  expect((await POST(new Request("http://localhost", { method: "POST", body: "x".repeat(25001) }))).status).toBe(413);
  expect(fetcher).not.toHaveBeenCalled();
});
it("retries temporary upstream failure and returns a supported answer", async () => {
  vi.stubEnv("GEMINI_API_KEY", "test-only");
  const fetcher = vi.fn().mockResolvedValueOnce(new Response("busy", { status: 503 })).mockResolvedValueOnce(upstream());
  vi.stubGlobal("fetch", fetcher);
  const result = await POST(request());
  expect(result.status).toBe(200); expect(await result.json()).toEqual(answer);
  expect(fetcher).toHaveBeenCalledTimes(2);
});
it("rejects hallucinated references without returning a fake answer", async () => {
  vi.stubEnv("GEMINI_API_KEY", "test-only");
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(upstream({ sections: [{ ...answer.sections[0], evidenceIds: ["video"] }] })));
  const result = await POST(request());
  expect(result.status).toBe(502); expect((await result.json()).error).toContain("supported answer");
});
it("reports rate limits and absent configuration", async () => {
  vi.stubEnv("GEMINI_API_KEY", ""); expect((await POST(request())).status).toBe(503);
  vi.stubEnv("GEMINI_API_KEY", "test-only");
  const fetcher = vi.fn().mockResolvedValue(new Response("limited", { status: 429 })); vi.stubGlobal("fetch", fetcher);
  const result = await POST(request()); expect((await result.json()).error).toContain("minute"); expect(fetcher).toHaveBeenCalledTimes(1);
});
