// Return provider diagnostics, never credentials or submitted movement data.
export async function providerError(response: Response, model: string, key: string, attempt: number) {
  let body: unknown;
  try { body = await response.json(); } catch { body = { message: "Google returned no JSON error details." }; }
  const sanitized = JSON.stringify(body, (name, value) => /key|token|authorization|prompt|contents/i.test(name) && !/quota/i.test(name) ? "[redacted]" : value)
    .split(key).join("[redacted]").replace(/AIza[\w-]+|AQ\.[\w-]+/g, "[redacted]");
  return { source: "Google Gemini", httpStatus: response.status, model, attempt: attempt + 1, retryAfter: response.headers.get("retry-after"), provider: JSON.parse(sanitized) as unknown };
}
