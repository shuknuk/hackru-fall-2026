import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ requireDevice: vi.fn(), dailyAnalytics: vi.fn() }));
vi.mock("@/lib/device/require-device", () => ({
  DeviceAuthError: class DeviceAuthError extends Error {},
  requireDevice: mocks.requireDevice,
}));
vi.mock("@/lib/db/analytics", () => ({ dailyAnalytics: mocks.dailyAnalytics }));
import { GET } from "./route";

describe("daily Tiger Data analytics", () => {
  beforeEach(() => { vi.clearAllMocks(); mocks.requireDevice.mockReturnValue("device_A"); });
  it("scopes the bounded UTC aggregation to the verified phone", async () => {
    mocks.dailyAnalytics.mockResolvedValue([]);
    const response = await GET(new Request("http://localhost/api/analytics/daily?days=7"));
    expect(response.status).toBe(200);
    expect(mocks.dailyAnalytics).toHaveBeenCalledWith("device_A", 7);
    expect(await response.json()).toEqual({ days: [], timezone: "UTC" });
  });
});
