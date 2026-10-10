import { readFile, writeFile, mkdir } from "node:fs/promises";
import { createHash } from "node:crypto";
import path from "node:path";

const manifest = JSON.parse(
  await readFile("docs/mediapipe-assets.json", "utf8"),
);
const sdkRoot = "node_modules/@mediapipe/tasks-vision";
const sdk = JSON.parse(
  await readFile(path.join(sdkRoot, "package.json"), "utf8"),
);
if (sdk.version !== manifest.sdk)
  throw new Error("MediaPipe SDK version does not match the asset manifest");
function verify(bytes, asset) {
  if (
    bytes.length !== asset.bytes ||
    createHash("sha256").update(bytes).digest("hex") !== asset.sha256
  ) {
    throw new Error(`Asset checksum mismatch: ${asset.path}`);
  }
}
async function save(asset, bytes) {
  verify(bytes, asset);
  const target = path.join("public", asset.path);
  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(target, bytes);
}
for (const asset of manifest.files)
  await save(asset, await readFile(path.join(sdkRoot, asset.source)));
const model = manifest.model;
let bytes;
try {
  bytes = await readFile(path.join("public", model.path));
  verify(bytes, model);
} catch {
  const response = await fetch(model.url, {
    signal: AbortSignal.timeout(60000),
  });
  if (
    !response.ok ||
    response.headers.get("content-type")?.includes("text/html")
  ) {
    throw new Error(`Model download failed: HTTP ${response.status}`);
  }
  bytes = Buffer.from(await response.arrayBuffer());
}
await save(model, bytes);
await writeFile(
  "public/mediapipe/asset-manifest.json",
  JSON.stringify(manifest),
);
await writeFile(
  "public/mediapipe/LICENSE.txt",
  await readFile("docs/LICENSE-mediapipe.txt"),
);
console.log(
  `Verified and prepared ${manifest.files.length} SDK assets and Lite model ${model.sha256.slice(0, 12)}`,
);
