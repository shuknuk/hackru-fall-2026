/* global self, caches */
const VERSION = __BUILD_VERSION__;
const CACHE = `menhel-shell-${VERSION}`;
const ROUTES = ["/", "/history", "/replay", "/compare"];
const MARKER = "/__menhel_ready__";
async function digest(bytes) {
  return [...new Uint8Array(await crypto.subtle.digest("SHA-256", bytes))]
    .map((x) => x.toString(16).padStart(2, "0"))
    .join("");
}
let preparation = null;
function prepare() {
  if (preparation) return preparation;
  preparation = (async () => {
    const temporary = `${CACHE}-pending`;
    try {
      const response = await fetch("/offline-inventory.json", {
        cache: "no-store",
      });
      if (!response.ok) throw new Error("Inventory unavailable");
      const inventory = await response.json();
      if (inventory.version !== VERSION || !Array.isArray(inventory.assets))
        throw new Error(
          "Build inventory mismatch. Refresh online to get the current version.",
        );
      await caches.delete(temporary);
      const temp = await caches.open(temporary);
      let completed = 0;
      for (const asset of inventory.assets) {
        const response = await fetch(asset.url, { cache: "no-store" });
        if (!response.ok || response.redirected)
          throw new Error(`Asset unavailable: ${asset.url}`);
        const bytes = await response.clone().arrayBuffer();
        if (
          bytes.byteLength !== asset.bytes ||
          (await digest(bytes)) !== asset.sha256
        )
          throw new Error(`Asset mismatch: ${asset.url}`);
        await temp.put(asset.key ?? asset.url, response);
        completed++;
        for (const client of await self.clients.matchAll({
          includeUncontrolled: true,
          type: "window",
        }))
          client.postMessage({
            type: "PREPARE_PROGRESS",
            completed,
            total: inventory.assets.length,
          });
      }
      const current = await caches.open(CACHE);
      await current.delete(MARKER);
      for (const asset of inventory.assets) {
        const key = asset.key ?? asset.url;
        await current.put(key, await temp.match(key));
      }
      await current.put(
        MARKER,
        new Response(JSON.stringify(inventory), {
          headers: { "Content-Type": "application/json" },
        }),
      );
    } catch (error) {
      for (const client of await self.clients.matchAll({
        includeUncontrolled: true,
        type: "window",
      }))
        client.postMessage({
          type: "PREPARE_ERROR",
          message:
            error instanceof Error
              ? error.message
              : "Asset verification failed",
        });
      throw error;
    } finally {
      await caches.delete(temporary);
    }
  })().finally(() => {
    preparation = null;
  });
  return preparation;
}
self.addEventListener("install", (event) => event.waitUntil(prepare()));
function query(client) {
  return new Promise((resolve) => {
    const channel = new MessageChannel();
    const timer = setTimeout(() => {
      channel.port1.close();
      resolve(null);
    }, 2000);
    channel.port1.onmessage = (e) => {
      clearTimeout(timer);
      channel.port1.close();
      resolve(e.data);
    };
    client.postMessage({ type: "UPDATE_QUERY" }, [channel.port2]);
  });
}
self.addEventListener("activate", (event) =>
  event.waitUntil(
    (async () => {
      const current = await caches.open(CACHE);
      if (!(await current.match(MARKER)))
        throw new Error("Offline cache is incomplete");
      const clients = await self.clients.matchAll({
        includeUncontrolled: true,
        type: "window",
      });
      const states = await Promise.all(clients.map(query));
      if (states.every(Boolean)) {
        const keep = new Set([VERSION, ...states.map((x) => x.version)]);
        for (const key of await caches.keys())
          if (
            key.startsWith("menhel-shell-") &&
            !keep.has(key.slice("menhel-shell-".length))
          )
            await caches.delete(key);
      }
      await self.clients.claim();
    })(),
  ),
);
self.addEventListener("message", (event) => {
  if (event.data?.type === "PREPARE")
    event.waitUntil(
      prepare()
        .then(() =>
          event.ports[0]?.postMessage({ ready: true, version: VERSION }),
        )
        .catch((error) =>
          event.ports[0]?.postMessage({
            ready: false,
            version: VERSION,
            error: error.message,
          }),
        ),
    );
  if (event.data?.type === "STATUS")
    event.waitUntil(
      (async () => {
        const cache = await caches.open(CACHE);
        const marker = await cache.match(MARKER);
        if (!marker) {
          event.ports[0]?.postMessage({ ready: false, version: VERSION });
          return;
        }
        const inventory = await marker.json();
        let ready = true;
        for (const asset of inventory.assets)
          if (!(await cache.match(asset.key ?? asset.url))) {
            ready = false;
            break;
          }
        event.ports[0]?.postMessage({ ready, version: VERSION });
      })(),
    );
  if (event.data?.type === "UPDATE")
    event.waitUntil(
      (async () => {
        const clients = await self.clients.matchAll({
          includeUncontrolled: true,
          type: "window",
        });
        const states = await Promise.all(clients.map(query));
        const safe = states.every((x) => x && !x.capturing);
        event.ports[0]?.postMessage({ safe });
        if (safe) await self.skipWaiting();
      })(),
    );
});
self.addEventListener("fetch", (event) => {
  const request = event.request,
    url = new URL(request.url);
  if (
    request.method !== "GET" ||
    url.origin !== self.location.origin ||
    request.headers.has("RSC") ||
    url.searchParams.has("_rsc")
  )
    return;
  if (request.mode === "navigate" && ROUTES.includes(url.pathname)) {
    event.respondWith(
      (async () => {
        try {
          return await fetch(request);
        } catch {
          const cache = await caches.open(CACHE);
          return (
            (await cache.match(url.pathname)) ??
            new Response(
              "Offline replay is unavailable. Reconnect and prepare this app version again.",
              { status: 503, headers: { "Content-Type": "text/plain" } },
            )
          );
        }
      })(),
    );
    return;
  }
  if (
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/icons/") ||
    url.pathname === "/manifest.webmanifest"
  )
    event.respondWith(
      (async () => {
        const current = await caches.open(CACHE);
        const hit = await current.match(url.pathname);
        if (hit) return hit;
        for (const key of await caches.keys())
          if (key.startsWith("menhel-shell-")) {
            const old = await (await caches.open(key)).match(url.pathname);
            if (old) return old;
          }
        return fetch(request);
      })(),
    );
});
