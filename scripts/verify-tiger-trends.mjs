import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { randomBytes, randomUUID } from "node:crypto";
import net from "node:net";
import { setTimeout as delay } from "node:timers/promises";

if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required for the explicit live Tiger verification");
const listener = net.createServer();
await new Promise((resolve) => listener.listen(0, "127.0.0.1", resolve));
const port = listener.address().port;
await new Promise((resolve) => listener.close(resolve));
const server = spawn(process.execPath, ["node_modules/next/dist/bin/next", "start", "--hostname", "127.0.0.1", "--port", String(port)], { stdio: ["ignore", "ignore", "inherit"], env: process.env });
const base = `http://127.0.0.1:${port}`;
const credentials = [randomBytes(32).toString("base64url"), randomBytes(32).toString("base64url")];
const summary = {
  sessionId: randomUUID(), recordedAt: new Date().toISOString(), exerciseType: "bodyweight-squat", source: "live", status: "complete",
  repCount: 3, durationMs: 12000, medianKneeBend: 65, kneeVariation: 3, medianAscentMs: 900, trackingCoverage: 0.95,
  visibleSide: "left", algorithmVersion: "verification-probe",
};
async function request(token, path, method = "GET", body) {
  return fetch(`${base}${path}`, { method, headers: { authorization: `Bearer ${token}`, "content-type": "application/json" }, ...(body ? { body: JSON.stringify(body) } : {}) });
}
try {
  let ready = false;
  for (let attempt = 0; attempt < 40; attempt++) {
    try { if ((await fetch(base)).ok) { ready = true; break; } } catch {}
    await delay(250);
  }
  assert(ready, "Production server did not start");
  assert.equal((await fetch(`${base}/api/workouts`)).status, 401);
  assert.equal((await request(credentials[0], "/api/workouts", "POST", summary)).status, 201);
  const duplicate = await request(credentials[0], "/api/workouts", "POST", summary);
  assert.equal(duplicate.status, 200);
  assert.equal((await duplicate.json()).created, false);
  assert.equal((await (await request(credentials[0], "/api/workouts")).json()).workouts.length, 1);
  assert.equal((await (await request(credentials[1], "/api/workouts")).json()).workouts.length, 0);
  assert.equal((await request(credentials[1], `/api/workouts/${summary.sessionId}`, "DELETE")).status, 404);
  const analytics = await (await request(credentials[0], "/api/analytics/daily?days=7")).json();
  assert.equal(analytics.days.reduce((sum, day) => sum + day.totalReps, 0), 3);
  assert.equal((await request(credentials[0], "/api/workouts", "DELETE")).status, 200);
  assert.equal((await (await request(credentials[0], "/api/workouts")).json()).workouts.length, 0);
  console.log("Live Tiger checks passed: insert, duplicate protection, two-phone isolation, daily analytics and deletion. Probe measurements are authored test data.");
} finally {
  let cleanupFailed = false;
  for (const token of credentials) {
    try { const response = await request(token, "/api/workouts", "DELETE"); if (!response.ok) cleanupFailed = true; }
    catch { cleanupFailed = true; }
  }
  server.kill("SIGTERM");
  if (cleanupFailed) { console.error("Live verification cleanup could not be confirmed; check probe rows before retrying."); process.exitCode = 1; }
}
