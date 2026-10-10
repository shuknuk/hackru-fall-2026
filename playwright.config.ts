import { defineConfig, devices } from "@playwright/test";
const fakeVideo = process.env.PLAYWRIGHT_FAKE_VIDEO;
const executablePath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH;
export default defineConfig({
  testDir: "./tests/e2e", fullyParallel: true, timeout: 60000, workers: 2,
  use: { baseURL: "http://127.0.0.1:3000", trace: "retain-on-failure", launchOptions: {
    ...(executablePath ? { executablePath } : {}),
    args: ["--no-sandbox", "--disable-dev-shm-usage", ...(fakeVideo ? ["--use-fake-device-for-media-stream", "--use-fake-ui-for-media-stream", `--use-file-for-fake-video-capture=${fakeVideo}`, "--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] : [])],
  } },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }, { name: "mobile-shell", use: { ...devices["iPhone 13"], defaultBrowserType: "chromium" } }],
  webServer: { command: "npm run start -- --hostname 127.0.0.1", url: "http://127.0.0.1:3000", reuseExistingServer: !process.env.CI },
});
