import { expect, test } from "@playwright/test";

test("voice requires a gesture, uses local audio and stops on mute and navigation", async ({ page }) => {
  await page.addInitScript(() => {
    const calls: string[] = [];
    Object.assign(window, { voiceCalls: calls });
    HTMLMediaElement.prototype.play = function () { calls.push(this.src); return Promise.resolve(); };
    HTMLMediaElement.prototype.pause = function () { calls.push("pause"); };
  });
  await page.goto("/session/record");
  const calls = () => page.evaluate(() => (window as unknown as { voiceCalls: string[] }).voiceCalls);
  expect(await calls()).toEqual([]);
  await page.getByRole("button", { name: "Enable voice guidance" }).click();
  await expect(page.getByRole("button", { name: "Mute voice guidance" })).toHaveAttribute("aria-pressed", "true");
  expect((await calls()).filter(c => c.endsWith("/narration/welcome.mp3"))).toHaveLength(1);
  await page.getByRole("button", { name: "Mute voice guidance" }).click();
  expect((await calls()).at(-1)).toBe("pause");
  await page.getByRole("button", { name: "Enable voice guidance" }).click();
  await page.getByRole("link", { name: "Back to squat guide", exact: true }).first().click();
  await expect.poll(async () => (await calls()).at(-1)).toBe("pause");
});

test("generated ElevenLabs clips are real audio files", async ({ request }) => {
  const manifest = await (await request.get("/narration/manifest.json")).json();
  expect(manifest.voice).toBe("River");
  expect(manifest.clips).toHaveLength(30);
  for (const clip of manifest.clips) {
    const response = await request.get(`/narration/${clip.id}.mp3`);
    expect(response.ok()).toBe(true);
    expect(response.headers()["content-type"]).toContain("audio/mpeg");
    expect((await response.body()).length).toBe(clip.bytes);
  }
});

test("the browser can decode and start the generated narration after a click", async ({ page }) => {
  await page.goto("/session/record");
  await page.getByRole("button", { name: "Enable voice guidance" }).click();
  await expect(page.getByRole("button", { name: "Mute voice guidance" })).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByText("Voice could not start", { exact: false })).toHaveCount(0);
  await page.getByRole("button", { name: "Mute voice guidance" }).click();
});

test("cancelled voice setup ignores a late playback response", async ({ page }) => {
  await page.addInitScript(() => {
    const state = { resolve: () => {}, starts: 0, stops: 0 };
    Object.assign(window, { pendingVoice: state });
    HTMLMediaElement.prototype.play = function () {
      state.starts++;
      return new Promise<void>(resolve => { state.resolve = resolve; });
    };
    HTMLMediaElement.prototype.pause = function () { state.stops++; };
  });
  await page.goto("/session/record");
  await page.getByRole("button", { name: "Enable voice guidance" }).click();
  await page.getByRole("button", { name: "Cancel voice setup" }).click();
  await page.evaluate(() => (window as unknown as { pendingVoice: { resolve: () => void } }).pendingVoice.resolve());
  await expect(page.getByRole("button", { name: "Enable voice guidance" })).toHaveAttribute("aria-pressed", "false");
  expect(await page.evaluate(() => {
    const state = (window as unknown as { pendingVoice: { starts: number; stops: number } }).pendingVoice;
    return { starts: state.starts, stops: state.stops };
  })).toEqual({ starts: 1, stops: 1 });
});
