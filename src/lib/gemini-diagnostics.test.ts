import { expect, it } from "vitest";
import { providerError } from "./gemini-diagnostics";
it("preserves Google quota and retry evidence while redacting credentials", async () => {
  const response = Response.json({ error: { status: "RESOURCE_EXHAUSTED", message: "quota exceeded secret-test-key", details: [{ quotaMetric: "input_token_count", quotaId: "per-day", retryDelay: "30s" }], apiKey: "secret-test-key" } }, { status: 429, headers: { "retry-after": "30" } });
  const result = await providerError(response, "gemini-2.5-flash", "secret-test-key", 0);
  expect(result.httpStatus).toBe(429);
  expect(result.retryAfter).toBe("30");
  expect(JSON.stringify(result)).toContain("input_token_count");
  expect(JSON.stringify(result)).not.toContain("secret-test-key");
});
