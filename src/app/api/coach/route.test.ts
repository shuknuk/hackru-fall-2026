import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "./route";
const input = {
  setA: { completedReps: 3, trackingCoverage: 1, medianKneeFlexion: 61, medianAscentMs: 1000 },
  setB: { completedReps: 3, trackingCoverage: 1, medianKneeFlexion: 72, medianAscentMs: 950 },
  evidence: [{ metricId: "median-peak-knee", deterministicText: "Set B showed about 10- more estimated knee flexion." }],
};
const answer = { headline: "Your squat comparison", explanations: [{ metricId: "median-peak-knee", text: "Set B showed about 10- more estimated knee flexion." }], caveat: "Single-camera movement estimates, not a medical assessment." };
function request() { return new Request("http://localhost/api/coach", { method: "POST", body: JSON.stringify(input) }); }
describe("Gemini comparison requests", () => {
  beforeEach(() => { vi.stubEnv("GEMINI_API_KEY", "test-key"); vi.stubEnv("GEMINI_MODEL", "gemini-2.5-flash"); });
  afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); vi.restoreAllMocks(); });
  it("retries a temporary server error and combines text parts", async () => {
    const text = JSON.stringify(answer);
    const fetcher = vi.fn().mockResolvedValueOnce(new Response("", { status: 503 })).mockResolvedValueOnce(Response.json({ candidates: [{ content: { parts: [{ thought: true, text: "private reasoning" }, { text: text.slice(0, 50) }, { text: text.slice(50) }] } }] }));
    vi.stubGlobal("fetch", fetcher);
    const result = await POST(request());
    expect(result.status).toBe(200);
    expect(await result.json()).toEqual(answer);
    expect(fetcher).toHaveBeenCalledTimes(2);
    const sent = JSON.parse(fetcher.mock.calls[0][1].body);
    expect(sent.generationConfig.thinkingConfig).toEqual({ thinkingBudget: 0 });
  });
  it("explains rate limits without pretending a result was generated", async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response("", { status: 429 }));
    vi.stubGlobal("fetch", fetcher);
    const result = await POST(request());
    expect(result.status).toBe(502);
    expect((await result.json()).error).toContain("request limit");
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
  it("rotates to the next configured key after a quota response", async () => {
    vi.stubEnv("GEMINI_API_KEY_2", "backup-key");
    const fetcher = vi.fn().mockResolvedValueOnce(new Response("", { status: 429 })).mockResolvedValueOnce(Response.json({ candidates: [{ content: { parts: [{ text: JSON.stringify(answer) }] } }] }));
    vi.stubGlobal("fetch", fetcher);
    expect((await POST(request())).status).toBe(200);
    expect(fetcher.mock.calls.map((call) => call[1].headers["x-goog-api-key"])).toEqual(["test-key", "backup-key"]);
  });
  it("rejects explanations referencing an unsubmitted measurement", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json({ candidates: [{ content: { parts: [{ text: JSON.stringify({ ...answer, explanations: [{ metricId: "knee-peak-mad", text: "Invented evidence" }] }) }] } }] })));
    const result = await POST(request());
    expect(result.status).toBe(502);
  });
});
