import { readFile, mkdir, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
const env = await readFile(".env.local", "utf8").catch(error => {
  if (error.code === "ENOENT") return "";
  throw error;
});
const key = process.env.ELEVENLABS_API_KEY ?? /^ELEVENLABS_API_KEY=(.+)$/m.exec(env)?.[1];
if (!key) throw new Error("Set ELEVENLABS_API_KEY in .env.local");
const source = await readFile("src/lib/motion/narration.ts", "utf8");
const block = source.split("export const CUES = {")[1].split("} as const;")[0];
const cues = [...block.matchAll(/(\w+): "([^"\n]+)"/g)];
if (cues.length !== 30) throw new Error("Review cue inventory before spending generation credits");
await mkdir("public/narration", { recursive: true });
const manifest = { provider: "ElevenLabs", voice: "River", voiceId: "SAz9YHcvj6GT2YYXdXww", model: "eleven_flash_v2_5", generatedAt: new Date().toISOString(), clips: [] };
for (const [, id, text] of cues) {
  const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${manifest.voiceId}?output_format=mp3_44100_128`, {
    method: "POST", headers: { "xi-api-key": key, "content-type": "application/json" },
    body: JSON.stringify({ text, model_id: manifest.model, voice_settings: { stability: 0.6, similarity_boost: 0.75, speed: 1 } }),
    signal: AbortSignal.timeout(30000),
  });
  if (!response.ok) throw new Error(`Generation failed for ${id}: HTTP ${response.status}`);
  if (!response.headers.get("content-type")?.startsWith("audio/")) throw new Error("Provider did not return audio");
  const bytes = Buffer.from(await response.arrayBuffer());
  if (bytes.length < 100) throw new Error("Empty narration clip");
  await writeFile(`public/narration/${id}.mp3`, bytes);
  manifest.clips.push({ id, text, bytes: bytes.length, sha256: createHash("sha256").update(bytes).digest("hex") });
  console.log(`Generated ${id}: ${bytes.length} bytes`);
}
await writeFile("public/narration/manifest.json", JSON.stringify(manifest, null, 2) + "\n");
