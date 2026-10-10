// Test-only reverse proxy around the production Next server. Never used by npm start or deployed routes.
import http from "node:http";
import { spawn } from "node:child_process";
import { readFile } from "node:fs/promises";
const port = Number(process.env.PLAYWRIGHT_PORT ?? 3017),
  backend = port + 1000;
let updateVersion = null;
const next = spawn(
  process.execPath,
  [
    "node_modules/next/dist/bin/next",
    "start",
    "--hostname",
    "127.0.0.1",
    "--port",
    String(backend),
  ],
  { stdio: ["ignore", "pipe", "inherit"] },
);
const server = http.createServer(async (req, res) => {
  try {
    const path = new URL(req.url, "http://localhost").pathname;
    if (path === "/__test/update" && req.method === "POST") {
      let body = "";
      for await (const chunk of req) {
        body += chunk;
        if (body.length > 512) {
          res.writeHead(413);
          res.end();
          return;
        }
      }
      const input = JSON.parse(body);
      if (input.version === null) {
        updateVersion = null;
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end('{"ok":true}');
        return;
      }
      if (
        typeof input.version !== "string" ||
        !/^test-update-[a-zA-Z0-9-]+$/.test(input.version)
      ) {
        res.writeHead(400);
        res.end();
        return;
      }
      updateVersion = input.version;
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end('{"ok":true}');
      return;
    }
    if (
      updateVersion &&
      (path === "/sw.js" || path === "/offline-inventory.json")
    ) {
      let body = await readFile(`public${path}`, "utf8");
      if (path === "/sw.js")
        body = body.replace(
          /const VERSION = "[^"]+";/,
          `const VERSION = "${updateVersion}";`,
        );
      else {
        const inventory = JSON.parse(body);
        inventory.version = updateVersion;
        body = JSON.stringify(inventory);
      }
      res.writeHead(200, {
        "Content-Type":
          path === "/sw.js" ? "application/javascript" : "application/json",
        "Cache-Control": "no-store",
        "Service-Worker-Allowed": "/",
      });
      res.end(body);
      return;
    }
    const upstream = http.request(
      {
        hostname: "127.0.0.1",
        port: backend,
        path: req.url,
        method: req.method,
        headers: { ...req.headers, host: `127.0.0.1:${backend}` },
      },
      (response) => {
        res.writeHead(response.statusCode ?? 502, response.headers);
        response.pipe(res);
      },
    );
    upstream.on("error", () => {
      if (!res.headersSent) res.writeHead(502);
      res.end("Test backend unavailable");
    });
    req.pipe(upstream);
  } catch (error) {
    if (!res.headersSent) res.writeHead(500);
    res.end(String(error));
  }
});
let listening = false;
next.stdout.on("data", (chunk) => {
  process.stdout.write(chunk);
  if (!listening && chunk.toString().includes("Ready")) {
    listening = true;
    server.listen(port, "127.0.0.1");
  }
});
next.on("exit", (code) => {
  server.close();
  process.exit(code ?? 1);
});
for (const signal of ["SIGTERM", "SIGINT"])
  process.on(signal, () => {
    server.close();
    next.kill(signal);
  });
