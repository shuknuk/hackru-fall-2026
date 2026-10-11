import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ requireDevice: vi.fn(), deleteWorkout: vi.fn() }));
vi.mock("@/lib/device/require-device", () => ({
  DeviceAuthError: class DeviceAuthError extends Error {},
  requireDevice: mocks.requireDevice,
}));
vi.mock("@/lib/db/workouts", () => ({ deleteWorkout: mocks.deleteWorkout }));
import { DELETE } from "./route";

describe("Tiger Data workout deletion", () => {
  beforeEach(() => { vi.clearAllMocks(); mocks.requireDevice.mockReturnValue("device_A"); });
  it("deletes only through the verified phone credential", async () => {
    mocks.deleteWorkout.mockResolvedValue(true);
    const id = "10000000-0000-4000-8000-000000000001";
    const response = await DELETE(new Request(`http://localhost/api/workouts/${id}`, { method: "DELETE" }), { params: Promise.resolve({ id }) });
    expect(response.status).toBe(200);
    expect(mocks.deleteWorkout).toHaveBeenCalledWith("device_A", id);
  });
});
