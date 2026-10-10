import { test, expect } from "@playwright/test";

test("denied permission is recoverable without retaining a stream", async ({ page }) => {
  await page.addInitScript(() => { navigator.mediaDevices.getUserMedia = async () => { throw new DOMException("Test denial", "NotAllowedError"); }; });
  await page.goto("/session");
  await page.getByRole("button", { name: "Start camera" }).click();
  await expect(page.getByRole("status")).toContainText("Camera permission was denied");
  await expect(page.getByRole("button", { name: "Start camera" })).toBeEnabled();
  expect(await page.locator("video").evaluate(video => (video as HTMLVideoElement).srcObject)).toBeNull();
});

test("Stop releases a late permission grant", async ({ page }) => {
  await page.addInitScript(() => {
    const state = { stopped: false, grant: () => {} };
    Object.assign(window, { cameraTest: state });
    navigator.mediaDevices.getUserMedia = () => new Promise<MediaStream>(resolve => {
      state.grant = () => resolve({ getTracks: () => [{ stop: () => { state.stopped = true; } }] } as unknown as MediaStream);
    });
  });
  await page.goto("/session");
  await page.getByRole("button", { name: "Start camera" }).click();
  await expect(page.getByRole("status")).toContainText("Waiting for camera permission");
  await page.getByRole("button", { name: "Stop camera" }).click();
  await page.evaluate(() => (window as unknown as { cameraTest: { grant: () => void } }).cameraTest.grant());
  await expect.poll(() => page.evaluate(() => (window as unknown as { cameraTest: { stopped: boolean } }).cameraTest.stopped)).toBe(true);
  await expect(page.getByRole("button", { name: "Start camera" })).toBeEnabled();
  expect(await page.locator("video").evaluate(video => (video as HTMLVideoElement).srcObject)).toBeNull();
});

for (const engine of ["worker-cpu", "main-cpu", "main-gpu"]) {
  test(`prerecorded camera input produces actual landmarks with ${engine}`, async ({ page }, testInfo) => {
    test.setTimeout(120000);
    test.skip(!process.env.PLAYWRIGHT_FAKE_VIDEO || testInfo.project.name !== "chromium", "Requires explicitly configured prerecorded input; never physical-device evidence");
    await page.goto("/session");
    await page.getByText("Development diagnostics", { exact: true }).click();
    await page.getByLabel("Pose engine").selectOption(engine);
    await page.getByRole("button", { name: "Start camera" }).click();
    await expect(page.locator(".camera-view")).toHaveAttribute("data-state", "live", { timeout: 40000 });
    await expect(page.locator(".diagnostics dl")).toContainText("33", { timeout: 15000 });
    await expect.poll(async () => Number(await page.locator(".diagnostics dl > div").filter({ hasText: "Processed frames" }).locator("dd").innerText()), { timeout: 20000 }).toBeGreaterThanOrEqual(12);
    await testInfo.attach("prerecorded-input-diagnostics", { body: await page.locator(".diagnostics").innerText(), contentType: "text/plain" });
    await page.evaluate(() => { Object.assign(window, { testCameraTracks: (document.querySelector("video")!.srcObject as MediaStream).getTracks() }); });
    await page.getByRole("button", { name: "Stop camera" }).click();
    expect(await page.evaluate(() => (window as unknown as { testCameraTracks: MediaStreamTrack[] }).testCameraTracks.every(track => track.readyState === "ended"))).toBe(true);
    expect(await page.locator("video").evaluate(video => (video as HTMLVideoElement).srcObject)).toBeNull();
    await page.getByRole("button", { name: "Start camera" }).click();
    await expect(page.locator(".camera-view")).toHaveAttribute("data-state", "live", { timeout: 40000 });
    await page.getByRole("button", { name: "Stop camera" }).click();
    await expect(page.getByRole("button", { name: "Start camera" })).toBeEnabled();
  });
}
