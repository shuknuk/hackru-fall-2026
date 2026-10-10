import { spawnSync } from "node:child_process";
import { readFile, writeFile, readdir, rm, mkdir } from "node:fs/promises";
import path from "node:path";
import { createHash, randomUUID } from "node:crypto";
const version = randomUUID();
await rm(".next", { recursive: true, force: true });
const built = spawnSync(
  process.execPath,
  ["node_modules/next/dist/bin/next", "build"],
  { stdio: "inherit", env: { ...process.env, MENHEL_BUILD_ID: version } },
);
if (built.status !== 0) process.exit(built.status ?? 1);
const assets = [];
async function add(url, file, key) {
  const bytes = await readFile(file);
  assets.push({
    url,
    sha256: createHash("sha256").update(bytes).digest("hex"),
    bytes: bytes.length,
    ...(key ? { key } : {}),
  });
}
await rm("public/offline-shell", { recursive: true, force: true });
await mkdir(`public/offline-shell/${version}`, { recursive: true });
for (const route of ["/", "/history", "/replay", "/compare"]) {
  const name = route === "/" ? "index" : route.slice(1);
  const file = `public/offline-shell/${version}/${name}.html`;
  await writeFile(file, await readFile(`.next/server/app/${name}.html`));
  await add(`/offline-shell/${version}/${name}.html`, file, route);
}
async function scan(dir) {
  for (const item of await readdir(dir, { withFileTypes: true })) {
    const file = path.join(dir, item.name);
    if (item.isDirectory()) await scan(file);
    else
      await add(
        "/_next/static/" +
          path.relative(".next/static", file).split(path.sep).join("/"),
        file,
      );
  }
}
await scan(".next/static");
for (const name of [
  "icon-192.png",
  "icon-512.png",
  "maskable-512.png",
  "apple-touch-icon.png",
])
  await add(`/icons/${name}`, `public/icons/${name}`);
await add(
  "/manifest.webmanifest",
  ".next/server/app/manifest.webmanifest.body",
);
const inventory = {
  version,
  routes: ["/", "/history", "/replay", "/compare"],
  assets,
};
await writeFile("public/offline-inventory.json", JSON.stringify(inventory));
const template = await readFile("scripts/sw-template.js", "utf8");
await writeFile(
  "public/sw.js",
  template.replace("__BUILD_VERSION__", JSON.stringify(version)),
);
console.log(
  `Offline inventory ${version}: ${assets.length} verified assets, ${(assets.reduce((n, a) => n + a.bytes, 0) / 1048576).toFixed(2)} MiB. Camera model is excluded.`,
);
