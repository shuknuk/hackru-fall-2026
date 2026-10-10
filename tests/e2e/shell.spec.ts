import { test, expect } from "@playwright/test";

test("home leads to honest session setup without requesting camera access", async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator.mediaDevices, "getUserMedia", { value: () => { throw new Error("Scaffold must not request camera access"); } });
  });
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("See your movement");
  await page.getByRole("link", { name: "Explore session setup" }).click();
  await expect(page).toHaveURL(/\/session$/);
  await expect(page.getByRole("heading", { name: "Room to move." })).toBeVisible();
  await expect(page.getByText("This screen does not request camera access yet.", { exact: false })).toBeVisible();
  await expect(page.locator("body")).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.getByRole("link", { name: "Back to Menhel" }).click();
  await expect(page).toHaveURL(/\/$/);
  expect(errors).toEqual([]);
});
