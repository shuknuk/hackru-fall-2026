export function geminiApiKeys() {
  return [
    process.env.GEMINI_API_KEY,
    process.env.GEMINI_API_KEY_2,
    process.env.GEMINI_API_KEY_3,
  ].filter((key): key is string => Boolean(key));
}

export function shouldRotateGeminiKey(status: number) {
  return status === 400 || status === 401 || status === 403 || status === 429;
}
