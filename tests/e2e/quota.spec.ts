import { expect, test } from "@playwright/test";

test("five guest workouts persist across refresh and block recording without blocking history", async ({ page }) => {
  await page.goto("/history");
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
  await expect(page.locator("#main").getByRole("link", { name: "Create free account" })).toBeVisible();
  await expect(page.locator("#main").getByRole("link", { name: "Sign in", exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "Continue to camera setup" })).toHaveCount(0);
  await page.reload();
  await expect(page.getByText("5 of 5 free workouts used")).toBeVisible();
  await page.goto("/history");
  await expect(page.getByRole("heading", { name: "Your movement library." })).toBeVisible();
});
