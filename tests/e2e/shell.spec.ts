import { test, expect } from "@playwright/test";

test("home leads to honest session setup without requesting camera access", async ({
  page,
}) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator.mediaDevices, "getUserMedia", {
      value: () => {
        throw new Error("Scaffold must not request camera access");
      },
    });
  });
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "See how your squat moves.",
  );
  await page.getByRole("link", { name: "Start a squat session" }).click();
  await expect(page).toHaveURL(/\/session$/);
  await expect(
    page.getByRole("heading", { name: "Get ready for your squats." }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "One comfortable down-and-up cycle" }),
  ).toBeVisible();
  await expect(page.getByText("RepDB (repdb.co)")).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Start camera" }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Stop camera" }),
  ).toHaveCount(0);
  await expect(page.locator("body")).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.getByRole("link", { name: "Back to SpotOn" }).click();
  await expect(page).toHaveURL(/\/$/);
  expect(errors).toEqual([]);
});
