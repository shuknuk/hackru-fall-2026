import { test, expect } from "@playwright/test";

test.afterEach(async ({ request }) => {
  await request.post("/__test/update", { data: { version: null } });
});

test("a verified worker update waits while another app tab is recording", async ({
  page,
  context,
  request,
}) => {
  test.setTimeout(90000);
  await page.goto("/history");
  await page
    .getByRole("button", { name: "Prepare offline replay", exact: true })
    .click();
  await expect(page.getByRole("status").last()).toContainText(
    "Offline replay ready",
    { timeout: 70000 },
  );
  const nextVersion = "test-update-" + Date.now();
  // Test proxy changes only worker generation; this is not a distinct app-bundle migration.
  await request.post("/__test/update", { data: { version: nextVersion } });
  const other = await context.newPage();
  await other.goto("/history");
  await other.evaluate(() => {
    document.documentElement.dataset.recording = "true";
    window.dispatchEvent(new Event("menhel-recording"));
  });
  await page.evaluate(async () => {
    const r = await navigator.serviceWorker.getRegistration();
    await r!.update();
  });
  await expect
    .poll(
      () =>
        page.evaluate(async () =>
          Boolean((await navigator.serviceWorker.getRegistration())?.waiting),
        ),
      { timeout: 20000 },
    )
    .toBe(true);
  await expect(
    page.getByRole("button", { name: "Apply saved-data-safe update" }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Apply saved-data-safe update" })
    .click();
  await expect(page.getByRole("status").last()).toContainText(
    "Another tab is recording",
  );
  expect(
    await page.evaluate(async () =>
      Boolean((await navigator.serviceWorker.getRegistration())?.waiting),
    ),
  ).toBe(true);
  await other.close();
  const reloaded = page.waitForEvent("domcontentloaded");
  await page
    .getByRole("button", { name: "Apply saved-data-safe update" })
    .click();
  await reloaded;
  await expect
    .poll(
      () =>
        page
          .evaluate(
            () =>
              new Promise<string>((resolve) => {
                const c = new MessageChannel();
                const timer = setTimeout(() => {
                  c.port1.close();
                  resolve("no-reply");
                }, 1000);
                c.port1.onmessage = (e) => {
                  clearTimeout(timer);
                  c.port1.close();
                  resolve(e.data.version);
                };
                navigator.serviceWorker.controller?.postMessage(
                  { type: "STATUS" },
                  [c.port2],
                );
              }),
          )
          .catch(() => "navigating"),
      { timeout: 15000 },
    )
    .toBe(nextVersion);
});
