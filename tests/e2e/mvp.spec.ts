import { test, expect, type Page } from "@playwright/test";
import type { Session } from "../../src/lib/motion/schema";


// Verify the retained worker directly now that the offline controls are removed.
async function prepareOffline(page: Page) {
  return page.evaluate(async () => {
    await navigator.serviceWorker.register("/sw.js");
    const registration = await navigator.serviceWorker.ready;
    return await new Promise<{ ready?: boolean; error?: string }>((resolve, reject) => {
      const channel = new MessageChannel();
      const timer = setTimeout(() => reject(new Error("Offline preparation timed out")), 70000);
      channel.port1.onmessage = (event) => { clearTimeout(timer); channel.port1.close(); resolve(event.data); };
      registration.active!.postMessage({ type: "PREPARE" }, [channel.port2]);
    });
  });
}

test("sample sets persist, replay, compare and delete without export or data controls", async ({
  page,
}, testInfo) => {
  test.setTimeout(90000);
  const errors: string[] = [];
  const requests: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("request", (r) => requests.push(r.url()));
  await page.goto("/history");
  await page
    .getByRole("button", { name: "Open squat sample pair" })
    .click();
  await expect(page).toHaveURL(/\/compare\?/);
  await expect(
    page.getByRole("heading", { name: "Limited comparison", exact: true }),
  ).toBeVisible();
  await page.getByRole("checkbox").check();
  await expect(
    page.getByRole("heading", { name: "Comparable", exact: true }),
  ).toBeVisible();
  await page.getByRole("slider", { name: "Squat replay progress" }).fill("50");
  await expect(
    page.getByText("50% · Bottom of squat", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText(/Set B showed about .* more estimated knee flexion/),
  ).toBeVisible();
  const coachButton = page.getByRole("button", {
    name: "Analyze with Gemini",
  });
  await expect(coachButton).toBeEnabled();
  const coachRequest = page.waitForRequest("**/api/coach");
  await coachButton.click();
  const posted = JSON.parse((await coachRequest).postData() ?? "{}");
  expect(Object.keys(posted).sort()).toEqual(["evidence", "setA", "setB"]);
  expect(JSON.stringify(posted)).not.toMatch(/landmarks|joints|sessionId|samples/);
  await expect(
    page.getByText("Gemini is not configured. Please contact the app owner."),
  ).toBeVisible();
  await expect(
    page.getByText(/Set B showed about .* more estimated knee flexion/),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: testInfo.outputPath("comparison.png"),
    fullPage: true,
  });
  await page.getByRole("link", { name: "Inspect this set" }).first().click();
  await expect(
    page.getByRole("heading", { name: "3 completed reps", exact: true }),
  ).toBeVisible();
  await page.getByLabel("Replay interval").selectOption("0");
  await page.getByRole("button", { name: "Play", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Pause", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Pause", exact: true }).click();
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "3 completed reps", exact: true }),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "Export session" })).toHaveCount(0);
  await page.goto("/history");
  await expect(page.getByRole("heading", { name: "Your data controls" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Export", exact: true })).toHaveCount(0);
  page.on("dialog", (d) => d.accept());
  await page.getByRole("button", { name: "Delete", exact: true }).first().click();
  await expect(page.getByRole("status").first()).toContainText("1 of 20");
  await page.getByRole("button", { name: "Delete", exact: true }).click();
  await expect(page.getByRole("status").first()).toContainText("No saved sessions");
  expect(requests.some((x) => x.includes("/mediapipe/"))).toBe(false);
  expect(errors).toEqual([]);
});

test("prepared history, replay and comparison survive hard offline reloads", async ({
  page,
  context,
}, testInfo) => {
  test.setTimeout(120000);
  await page.goto("/history");
  await page
    .getByRole("button", { name: "Open squat sample pair" })
    .click();
  await expect(page).toHaveURL(/\/compare\?/);
  const compare = page.url();
  expect((await prepareOffline(page)).ready).toBe(true);
  // A missing cached shell must be repairable without a different worker script.
  await page.evaluate(async () => {
    for (const name of await caches.keys())
      if (name.startsWith("menhel-shell-") && !name.endsWith("-pending"))
        await (await caches.open(name)).delete("/replay");
  });
  expect((await prepareOffline(page)).ready).toBe(true);
  await context.setOffline(true);
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Limited comparison", exact: true }),
  ).toBeVisible();
  await page.getByRole("checkbox").check();
  await expect(
    page.getByRole("heading", { name: "Comparable", exact: true }),
  ).toBeVisible();
  await page.goto("/history");
  await expect(page.getByRole("status").first()).toContainText("2 of 20");
  await page.getByRole("link", { name: "Replay", exact: true }).first().click();
  await expect(
    page.getByRole("heading", { name: "3 completed reps", exact: true }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Movement replay", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Play", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Pause", exact: true }),
  ).toBeVisible();
  await page.goto(compare);
  await expect(
    page.getByRole("heading", { name: "Limited comparison", exact: true }),
  ).toBeVisible();
  await page.screenshot({
    path: testInfo.outputPath("offline.png"),
    fullPage: true,
  });
});

test("storage failures preserve a readable recovery path", async ({ page }) => {
  await page.addInitScript(() => {
    indexedDB.open = () => {
      throw new DOMException("Test storage unavailable", "QuotaExceededError");
    };
  });
  await page.goto("/history");
  await expect(page.getByRole("status").first()).toContainText(
    "Local storage unavailable",
  );
  await expect(
    page.getByRole("button", { name: "Open squat sample pair" }),
  ).toBeVisible();
});

test("the removed offline controls do not appear in the library", async ({ page }) => {
  await page.goto("/history");
  await expect(page.getByRole("heading", { name: "Keep replay close" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Prepare offline replay" })).toHaveCount(0);
});

test("recording starts with a guide and continues to a separate camera page", async ({ page }) => {
  await page.goto("/session?profile=test-profile");
  await expect(page.getByRole("heading", { name: "Side-view squat setup" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Start camera" })).toHaveCount(0);
  await page.getByRole("link", { name: "Continue to camera setup" }).click();
  await expect(page).toHaveURL(/session\/record\?profile=test-profile/);
  await expect(page.getByRole("button", { name: "Start camera" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Your setup", exact: true })).toBeVisible();
});

test("a checkpointed draft recovers only completed cycles and the library cap never erases sessions", async ({
  page,
}) => {
  test.setTimeout(90000);
  await page.goto("/history");
  await page
    .getByRole("button", { name: "Open squat sample pair" })
    .click();
  await page.getByRole("link", { name: "Inspect this set" }).first().click();
  const original = await page.evaluate(() => new Promise<Session>((resolve, reject) => {
    const request = indexedDB.open("menhel-motion", 1);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const db = request.result;
      const records = db.transaction("sessions").objectStore("sessions").getAll();
      records.onsuccess = () => { resolve(records.result[0]); db.close(); };
      records.onerror = () => { reject(records.error); db.close(); };
    };
  }));
  // Seed an authored fixture as a draft solely to verify the recovery transaction.
  await page.evaluate(async (s) => {
    await new Promise<void>((resolve, reject) => {
      const r = indexedDB.open("menhel-motion", 1);
      r.onerror = () => reject(r.error);
      r.onsuccess = () => {
        const db = r.result,
          tx = db.transaction("drafts", "readwrite");
        tx.objectStore("drafts").put({
          id: crypto.randomUUID(),
          createdAt: s.createdAt,
          profile: s.profile,
          capture: s.capture,
          samples: s.samples,
        });
        tx.oncomplete = () => {
          db.close();
          resolve();
        };
        tx.onerror = () => reject(tx.error);
      };
    });
  }, original);
  await page.goto("/history");
  await page
    .getByRole("button", { name: "Recover draft", exact: true })
    .click();
  await expect(page.getByRole("status").first()).toContainText("3 of 20");
  await expect(page.getByText(/· interrupted/)).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Interrupted drafts", exact: true }),
  ).toHaveCount(0);
  await page.evaluate(async (s) => {
    await new Promise<void>((resolve, reject) => {
      const r = indexedDB.open("menhel-motion", 1);
      r.onsuccess = () => {
        const db = r.result,
          tx = db.transaction("sessions", "readwrite"),
          store = tx.objectStore("sessions");
        store.clear();
        for (let i = 0; i < 20; i++)
          store.put({ ...s, id: crypto.randomUUID() });
        tx.oncomplete = () => {
          db.close();
          resolve();
        };
        tx.onerror = () => reject(tx.error);
      };
    });
  }, original);
  await page.reload();
  await expect(page.getByRole("status").first()).toContainText("20 of 20");
  await page.getByRole("button", { name: "Open squat sample pair" }).click();
  await expect(page.getByRole("status").first()).toContainText(
    "Twenty sessions are already saved",
  );
  await page.reload();
  await expect(page.getByRole("status").first()).toContainText("20 of 20");
});
