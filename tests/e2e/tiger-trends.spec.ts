import { expect, test } from "@playwright/test";
import { samplePair } from "../../src/lib/motion/fixtures";

test("a phone can explicitly start Tiger Data measurement trends without an account", async ({ page }) => {
  const authorizations: string[] = [];
  await page.route("**/api/workouts?limit=50", async (route) => {
    authorizations.push(route.request().headers().authorization ?? "");
    await route.fulfill({ json: { workouts: [] } });
  });
  await page.route("**/api/analytics/daily?days=30", async (route) => {
    authorizations.push(route.request().headers().authorization ?? "");
    await route.fulfill({ json: { days: [] } });
  });
  await page.goto("/dashboard");
  await page.getByRole("button", { name: "View measurements over time with Tiger Data" }).click();
  await expect(page.getByText("Tiger Data summaries are up to date.")).toBeVisible();
  expect(authorizations).toHaveLength(2);
  expect(authorizations.every((value) => /^Bearer [A-Za-z0-9_-]{43}$/.test(value))).toBe(true);
  await page.reload();
  await expect(page.getByText("Tiger Data summaries are up to date.")).toBeVisible();
  expect(new Set(authorizations).size).toBe(1);
});

test("Tiger measurement charts display recorded values and deletion preserves local history", async ({ page }) => {
  const uploaded: Record<string, unknown>[] = [];
  const workout = { sessionId: "10000000-0000-4000-8000-000000000001", recordedAt: "2026-10-11T12:00:00.000Z", exerciseType: "bodyweight-squat", source: "live", status: "complete", repCount: 3, durationMs: 12000, medianKneeBend: 65, kneeVariation: 3, medianAscentMs: 900, trackingCoverage: 0.95, visibleSide: "left", algorithmVersion: "verification-fixture" };
  await page.route("**/api/workouts?limit=50", (route) => route.fulfill({ json: { workouts: [workout] } }));
  await page.route("**/api/analytics/daily?days=30", (route) => route.fulfill({ json: { days: [] } }));
  await page.route("**/api/workouts", async (route) => {
    if (route.request().method() === "POST") uploaded.push(route.request().postDataJSON());
    await route.fulfill({ status: route.request().method() === "POST" ? 201 : 200, json: { created: true, deleted: true } });
  });
  await page.goto("/dashboard");
  await expect(page.getByText("Detailed recordings stay on this phone until you choose to view measurements over time.")).toBeVisible();
  const pair = samplePair();
  pair[0] = { ...pair[0], source: "live" };
  await page.evaluate(async (sessions) => {
    await new Promise<void>((resolve, reject) => {
      const request = indexedDB.open("menhel-motion");
      request.onsuccess = () => {
        const db = request.result;
        const tx = db.transaction("sessions", "readwrite");
        for (const session of sessions) tx.objectStore("sessions").put(session);
        tx.oncomplete = () => { db.close(); resolve(); };
        tx.onerror = () => reject(tx.error);
      };
      request.onerror = () => reject(request.error);
    });
  }, pair);
  await page.getByRole("button", { name: "View measurements over time with Tiger Data" }).click();
  await expect(page.getByRole("heading", { name: "Estimated knee bend" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Estimated ascent time" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Tracking coverage" })).toBeVisible();
  await expect(page.getByText("3 completed reps")).toBeVisible();
  expect(uploaded).toHaveLength(1);
  expect(uploaded[0].sessionId).toBe(pair[0].id);
  expect(Object.keys(uploaded[0]).sort()).toEqual(Object.keys(workout).sort());
  for (const details of await page.locator("details").all()) await details.locator("summary").click();
  await expect(page.getByRole("listitem").filter({ hasText: "65.0 °" })).toBeVisible();
  await expect(page.getByRole("listitem").filter({ hasText: "0.9 s" })).toBeVisible();
  await expect(page.getByRole("listitem").filter({ hasText: "95.0 %" })).toBeVisible();
  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "Delete Tiger Data history" }).click();
  await expect(page.getByRole("button", { name: "View measurements over time with Tiger Data" })).toBeVisible();
  expect(await page.evaluate(() => new Promise<number>((resolve) => {
    const request = indexedDB.open("menhel-motion");
    request.onsuccess = () => {
      const db = request.result;
      const count = db.transaction("sessions").objectStore("sessions").count();
      count.onsuccess = () => { db.close(); resolve(count.result); };
    };
  }))).toBe(2);
});
