import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireDevice: vi.fn(),
  insertWorkout: vi.fn(),
  listWorkouts: vi.fn(),
  deleteAllWorkouts: vi.fn(),
}));
vi.mock("@/lib/device/require-device", () => ({
  DeviceAuthError: class DeviceAuthError extends Error {},
  requireDevice: mocks.requireDevice,
}));
vi.mock("@/lib/db/workouts", () => ({ insertWorkout: mocks.insertWorkout, listWorkouts: mocks.listWorkouts, deleteAllWorkouts: mocks.deleteAllWorkouts }));
import { DELETE, GET, POST } from "./route";

const summary = {
  sessionId: "10000000-0000-4000-8000-000000000001",
  recordedAt: "2026-10-11T12:00:00.000Z",
  exerciseType: "bodyweight-squat",
  source: "live",
  status: "complete",
  repCount: 3,
  durationMs: 12000,
  medianKneeBend: 65,
  kneeVariation: 3,
  medianAscentMs: 900,
  trackingCoverage: 0.95,
  visibleSide: "left",
  algorithmVersion: "squat-projected-v1",
};
describe("phone-scoped workout routes", () => {
  beforeEach(() => { vi.clearAllMocks(); mocks.requireDevice.mockReturnValue("device_A"); });
  it("derives scope from the phone credential and rejects a supplied owner field", async () => {
    const invalid = await POST(new Request("http://localhost/api/workouts", { method: "POST", body: JSON.stringify({ ...summary, userId: "device_B" }) }));
    expect(invalid.status).toBe(400);
    mocks.insertWorkout.mockResolvedValue({ created: true });
    const response = await POST(new Request("http://localhost/api/workouts", { method: "POST", body: JSON.stringify(summary) }));
    expect(response.status).toBe(201);
    expect(mocks.insertWorkout).toHaveBeenCalledWith("device_A", summary);
  });
  it("excludes synthetic sessions from cloud statistics", async () => {
    const response = await POST(new Request("http://localhost/api/workouts", { method: "POST", body: JSON.stringify({ ...summary, source: "sample-synthetic" }) }));
    expect(response.status).toBe(400);
    expect(mocks.insertWorkout).not.toHaveBeenCalled();
  });
  it("rejects malformed and oversized bodies even without a content-length header", async () => {
    expect((await POST(new Request("http://localhost/api/workouts", { method: "POST", body: "{" }))).status).toBe(400);
    expect((await POST(new Request("http://localhost/api/workouts", { method: "POST", body: "x".repeat(4097) }))).status).toBe(413);
    expect(mocks.insertWorkout).not.toHaveBeenCalled();
  });
  it("deletes only the history scoped to the verified phone", async () => {
    expect((await DELETE(new Request("http://localhost/api/workouts", { method: "DELETE" }))).status).toBe(200);
    expect(mocks.deleteAllWorkouts).toHaveBeenCalledWith("device_A");
  });
  it("scopes history to the verified phone", async () => {
    mocks.listWorkouts.mockResolvedValue([]);
    const response = await GET(new Request("http://localhost/api/workouts?limit=10"));
    expect(response.status).toBe(200);
    expect(mocks.listWorkouts).toHaveBeenCalledWith("device_A", 10, undefined);
  });
  it("requires a phone credential before database access", async () => {
    const { DeviceAuthError } = await import("@/lib/device/require-device");
    mocks.requireDevice.mockImplementation(() => { throw new DeviceAuthError("Missing device credential."); });
    const response = await GET(new Request("http://localhost/api/workouts"));
    expect(response.status).toBe(401);
    expect(mocks.listWorkouts).not.toHaveBeenCalled();
  });
});
