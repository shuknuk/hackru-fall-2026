import { expect, test } from "@playwright/test";
import { clerk, clerkSetup, setupClerkTestingToken } from "@clerk/testing/playwright";

const liveAuth = process.env.PLAYWRIGHT_LIVE_AUTH === "1";
let userId: string | null = null;

test.describe("live Clerk and Tiger Data", () => {
  test.skip(!liveAuth, "Set PLAYWRIGHT_LIVE_AUTH=1 to use the configured development services.");

  test.beforeAll(async () => {
    await clerkSetup();
  });

  test.afterAll(async () => {
    if (!userId || !process.env.CLERK_SECRET_KEY) return;
    const response = await fetch(`https://api.clerk.com/v1/users/${encodeURIComponent(userId)}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${process.env.CLERK_SECRET_KEY}` },
    });
    if (!response.ok && response.status !== 404)
      throw new Error(`Clerk test-user cleanup failed (${response.status}).`);
  });

  test("sign-up lifts the guest limit and scopes a workout summary to the Clerk user", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "chromium", "One live account flow is sufficient.");
    await setupClerkTestingToken({ page });
    await page.goto("/history");
    await clerk.loaded({ page });
    await page.evaluate(async () => {
      await new Promise<void>((resolve, reject) => {
        const request = indexedDB.open("menhel-motion", 2);
        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
          const db = request.result;
          const transaction = db.transaction("guestUsage", "readwrite");
          const store = transaction.objectStore("guestUsage");
          for (let index = 0; index < 5; index++)
            store.put({ sessionId: crypto.randomUUID(), countedAt: new Date().toISOString() });
          transaction.oncomplete = () => { db.close(); resolve(); };
          transaction.onerror = () => reject(transaction.error);
        };
      });
    });

    await page.goto("/session");
    await expect(page.getByText("5 of 5 free workouts used")).toBeVisible();
    await page.getByRole("link", { name: "Create free account" }).first().click();
    await expect(page.locator(".cl-signUp-root")).toBeVisible();

    const email = `menhel.${Date.now()}+clerk_test@example.com`;
    await page.locator('input[name="emailAddress"]').fill(email);
    await page.locator('input[name="password"]').fill(`MenhelMotion!${Date.now()}`);
    await page.getByRole("button", { name: "Continue", exact: true }).click();
    const firstDigit = page.getByRole("textbox", { name: "Enter verification code. Digit 1" });
    if (await firstDigit.isVisible()) {
      await firstDigit.click();
      await page.keyboard.type("424242");
    } else await page.getByLabel("Enter verification code").fill("424242");

    await page.waitForURL("**/dashboard");
    await expect(page.getByRole("heading", { name: "My progress." })).toBeVisible();
    userId = await page.evaluate(() => window.Clerk?.user?.id ?? null);
    expect(userId).toMatch(/^user_/);

    await page.goto("/session");
    await expect(page.getByRole("link", { name: "Continue to camera setup" })).toBeVisible();

    const sessionId = crypto.randomUUID();
    const summary = {
      sessionId,
      recordedAt: new Date().toISOString(),
      exerciseType: "bodyweight-squat",
      source: "live",
      status: "complete",
      repCount: 3,
      durationMs: 12_000,
      medianKneeBend: 75,
      kneeVariation: 4,
      medianAscentMs: 1_200,
      trackingCoverage: 0.95,
      visibleSide: "left",
      algorithmVersion: "live-auth-e2e",
    };
    const created = await page.request.post("/api/workouts", { data: summary });
    expect(created.status()).toBe(201);
    expect(await created.json()).toEqual({ created: true });
    const repeated = await page.request.post("/api/workouts", { data: summary });
    expect(repeated.status()).toBe(200);
    expect(await repeated.json()).toEqual({ created: false });

    const workouts = await page.request.get("/api/workouts");
    expect(workouts.status()).toBe(200);
    expect((await workouts.json()).workouts).toEqual(
      expect.arrayContaining([expect.objectContaining({ sessionId, repCount: 3 })]),
    );
    const analytics = await page.request.get("/api/analytics/daily?days=7");
    expect(analytics.status()).toBe(200);
    expect((await analytics.json()).days).toEqual(
      expect.arrayContaining([expect.objectContaining({ totalReps: 3 })]),
    );

    const deleted = await page.request.delete(`/api/workouts/${sessionId}`);
    expect(deleted.status()).toBe(200);
    expect(await deleted.json()).toEqual({ deleted: true });
    const afterDelete = await page.request.get("/api/workouts");
    expect((await afterDelete.json()).workouts).not.toEqual(
      expect.arrayContaining([expect.objectContaining({ sessionId })]),
    );
  });
});
