import { test, expect } from "@playwright/test";

test("simulated camera landmarks complete calibration, recording and local replay", async ({
  page,
}, testInfo) => {
  test.setTimeout(90000);
  await page.addInitScript(() => {
    const voiceCalls: string[] = [];
    Object.assign(window, { voiceCalls });
    const play = HTMLMediaElement.prototype.play;
    const pause = HTMLMediaElement.prototype.pause;
    HTMLMediaElement.prototype.play = function () {
      if (this instanceof HTMLAudioElement) { voiceCalls.push(this.src); return Promise.resolve(); }
      return play.call(this);
    };
    HTMLMediaElement.prototype.pause = function () {
      if (this instanceof HTMLAudioElement) voiceCalls.push("pause");
      else pause.call(this);
    };
    // This semantic capture test uses a deterministic 20 Hz capture clock.
    // Real scheduling/performance is exercised separately by the SDK/device checks.
    const state = { mode: "stand", since: 1000, clock: 1000 };
    Object.defineProperty(performance, "now", { value: () => state.clock });
    const frameCallback = HTMLVideoElement.prototype.requestVideoFrameCallback;
    HTMLVideoElement.prototype.requestVideoFrameCallback = function (callback) {
      return frameCallback.call(this, (now, metadata) => {
        state.clock += 50;
        callback(now, metadata);
      });
    };
    Object.assign(window, { motionFixture: state });
    function joints(flex: number) {
      const a = (flex * Math.PI) / 180;
      const j = Array.from({ length: 33 }, () => ({
        x: 0.5,
        y: 0.5,
        z: 0,
        visibility: 0.99,
        presence: 0.99,
      }));
      for (const n of [0, 1]) {
        const x = 0.45 + n * 0.055;
        j[11 + n] = { ...j[11 + n], x: x - 0.05, y: 0.27 };
        j[23 + n] = { ...j[23 + n], x, y: 0.48 };
        j[25 + n] = { ...j[25 + n], x, y: 0.68 };
        j[27 + n] = {
          ...j[27 + n],
          x: x + Math.sin(a) * 0.15,
          y: 0.68 + Math.cos(a) * 0.2,
        };
      }
      return j;
    }
    class TestWorker {
      onmessage: ((event: { data: unknown }) => void) | null = null;
      onerror = null;
      closed = false;
      postMessage(message: {
        type: string;
        generation: string;
        frameId: number;
        bitmap?: ImageBitmap;
      }) {
        if (this.closed) return;
        if (message.type === "init") {
          setTimeout(() => this.onmessage?.({ data: { type: "ready" } }), 10);
          return;
        }
        const t = performance.now() - state.since;
        let flex = 0;
        if (state.mode === "setup") {
          flex =
            t < 1200
              ? (65 * t) / 1200
              : t < 2400
                ? 65 * (1 - (t - 1200) / 1200)
                : 0;
        }
        if (state.mode === "triple") {
          const phase = t - 700;
          if (phase >= 0 && phase < 8100) {
            const cycle = phase % 2700;
            flex =
              cycle < 1000
                ? (65 * cycle) / 1000
                : cycle < 2000
                  ? 65 * (1 - (cycle - 1000) / 1000)
                  : 0;
          }
        }
        message.bitmap?.close();
        setTimeout(() => {
          if (!this.closed)
            this.onmessage?.({
              data: {
                type: "result",
                generation: message.generation,
                frameId: message.frameId,
                joints: state.mode === "lost" ? [] : joints(flex),
                inferenceMs: 5,
              },
            });
        }, 5);
      }
      terminate() {
        this.closed = true;
      }
    }
    Object.assign(window, { Worker: TestWorker });
    navigator.mediaDevices.getUserMedia = async () => {
      const canvas = document.createElement("canvas");
      canvas.width = 320;
      canvas.height = 240;
      const context = canvas.getContext("2d")!;
      let i = 0;
      const timer = setInterval(() => {
        context.fillStyle = i++ % 2 ? "#19211b" : "#263127";
        context.fillRect(0, 0, 320, 240);
      }, 50);
      const stream = canvas.captureStream(20);
      const track = stream.getVideoTracks()[0];
      const stop = track.stop.bind(track);
      track.stop = () => {
        clearInterval(timer);
        stop();
      };
      return stream;
    };
  });
  await page.goto(`/session/record?verification=${Date.now()}`);
  await page.getByRole("button", { name: "Enable voice guidance" }).click();
  await page.getByRole("button", { name: "Start camera", exact: true }).click();
  await expect(page.locator(".camera-view")).toHaveAttribute(
    "data-state",
    "live",
  );
  await page.getByRole("checkbox", { name: /I am side-on/ }).check();
  await page
    .getByRole("button", { name: "Calibrate comfortable range" })
    .click();
  await expect(page.locator('[aria-labelledby="calibration-title"]').getByRole("status").first()).toContainText(
    "Now perform one comfortable setup squat",
    { timeout: 10000 },
  );
  await page.evaluate(() => {
    const s = (
      window as unknown as { motionFixture: { mode: string; since: number } }
    ).motionFixture;
    s.mode = "setup";
    s.since = performance.now();
  });
  await expect(page.locator('[aria-labelledby="calibration-title"]').getByRole("status").first()).toContainText("Calibration complete. Your set is starting in 3 seconds", { timeout: 10000 });
  await expect(page.locator("p").filter({ hasText: /^Calibration: Calibration complete$/ })).toBeVisible();
  await page.getByRole("button", { name: "Cancel start" }).click();
  await page.evaluate(() => {
    (window as unknown as { motionFixture: { mode: string } }).motionFixture.mode = "lost";
  });
  await page.getByRole("button", { name: "Start set", exact: true }).click();
  await expect(page.getByRole("button", { name: "Cancel start" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Finish set", exact: true })).toBeDisabled();
  await expect(page.locator('[aria-labelledby="calibration-title"]').getByRole("status").first()).toContainText("Recording has not started");
  await page.getByRole("button", { name: "Cancel start" }).click();
  await expect(page.getByRole("button", { name: "Start set", exact: true })).toBeEnabled();
  await page.getByRole("button", { name: "Start set", exact: true }).click();
  await expect(page.getByRole("button", { name: "Cancel start" })).toBeVisible();
  await page.evaluate(() => {
    (window as unknown as { motionFixture: { mode: string } }).motionFixture.mode = "stand";
  });
  await expect(page.getByRole("button", { name: "Finish set", exact: true })).toBeEnabled();
  await expect(page.locator('[aria-labelledby="calibration-title"]').getByRole("status").first()).toContainText("Set started");
  await page.evaluate(() => {
    const s = (
      window as unknown as { motionFixture: { mode: string; since: number } }
    ).motionFixture;
    s.mode = "triple";
    s.since = performance.now();
  });
  await expect(
    page
      .locator(".metric-grid > div")
      .filter({ hasText: "Completed reps" })
      .locator("dd"),
  )
    .toHaveText("3", { timeout: 45000 })
    .catch(async (error) => {
      const drafts = await page.evaluate(
        () =>
          new Promise((resolve) => {
            const r = indexedDB.open("menhel-motion");
            r.onsuccess = () => {
              const db = r.result;
              const get = db
                .transaction("drafts")
                .objectStore("drafts")
                .getAll();
              get.onsuccess = () => {
                resolve(get.result);
                db.close();
              };
            };
          }),
      );
      await testInfo.attach("simulated-capture-drafts", {
        body: JSON.stringify(drafts),
        contentType: "application/json",
      });
      throw error;
    });
  const spoken = await page.evaluate(() => (window as unknown as { voiceCalls: string[] }).voiceCalls);
  for (const cue of ["squat", "starting", "recording", "rep1", "rep2"]) {
    expect(spoken.some(url => url.endsWith(`/narration/${cue}.mp3`))).toBe(true);
  }
  await page.getByRole("button", { name: "Finish set", exact: true }).click();
  await expect(page).toHaveURL(/\/results\?id=/);
  await expect(page.getByRole("heading", { name: "3 completed reps", exact: true })).toBeVisible();
  await expect(page.getByRole("status").first()).toHaveText("Saved on this device.");
  await expect(page.locator("video")).toHaveCount(0);
  await page.reload();
  await expect(page.getByRole("heading", { name: "3 completed reps", exact: true })).toBeVisible();
  await page.getByRole("link", { name: "Replay set", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "3 completed reps", exact: true }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "3 completed reps", exact: true }),
  ).toBeVisible();
});
