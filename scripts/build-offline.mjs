import { spawnSync } from "node:child_process";
import { readFile, writeFile, readdir, rm, mkdir } from "node:fs/promises";
import path from "node:path";
import { createHash, randomUUID } from "node:crypto";
import { spawn } from "node:child_process";
import net from "node:net";
import { setTimeout as delay } from "node:timers/promises";
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
const portServer = net.createServer();
await new Promise((resolve, reject) => {
  portServer.once("error", reject);
  portServer.listen(0, "127.0.0.1", resolve);
});
const address = portServer.address();
if (!address || typeof address === "string")
  throw new Error("Could not reserve a local port for the production server");
const port = address.port;
await new Promise((resolve, reject) => portServer.close((error) => error ? reject(error) : resolve()));
const server = spawn(
  process.execPath,
  ["node_modules/next/dist/bin/next", "start", "--hostname", "127.0.0.1", "--port", String(port)],
  { stdio: "ignore", env: { ...process.env, NEXT_TELEMETRY_DISABLED: "1" } },
);
const serverExit = new Promise((resolve) => server.once("exit", resolve));
async function stopServer() {
  if (server.exitCode !== null || server.signalCode !== null) return;
  server.kill("SIGTERM");
  const exited = await Promise.race([
    serverExit.then(() => true),
    delay(3000).then(() => false),
  ]);
  if (!exited) server.kill("SIGKILL");
}
try {
  let ready = false;
  for (let attempt = 0; attempt < 80; attempt++) {
    if (server.exitCode !== null)
      throw new Error(`Production server exited with ${server.exitCode}`);
    try {
      const response = await fetch(`http://127.0.0.1:${port}/`);
      if (response.ok) {
        await response.arrayBuffer();
        ready = true;
        break;
      }
    } catch {
      // Wait for the just-built production server to start accepting requests.
    }
    await delay(250);
  }
  if (!ready) throw new Error("Production server did not become ready");
for (const route of ["/", "/history", "/replay", "/compare"]) {
  const name = route === "/" ? "index" : route.slice(1);
  const file = `public/offline-shell/${version}/${name}.html`;
  const response = await fetch(`http://127.0.0.1:${port}${route}`);
  if (!response.ok || !response.headers.get("content-type")?.includes("text/html"))
    throw new Error(`Could not capture offline shell for ${route}: HTTP ${response.status}`);
  await writeFile(file, Buffer.from(await response.arrayBuffer()));
  await add(`/offline-shell/${version}/${name}.html`, file, route);
}
} finally {
  await stopServer();
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
