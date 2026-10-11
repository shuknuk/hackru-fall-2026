import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireUser: vi.fn(),
  insertWorkout: vi.fn(),
  listWorkouts: vi.fn(),
}));
vi.mock("@/lib/auth/require-user", () => ({
  AuthError: class AuthError extends Error { constructor(public status: number, message: string) { super(message); } },
  requireUser: mocks.requireUser,
}));
vi.mock("@/lib/db/workouts", () => ({ insertWorkout: mocks.insertWorkout, listWorkouts: mocks.listWorkouts }));
import { GET, POST } from "./route";

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
describe("authenticated workout routes", () => {
  beforeEach(() => { vi.clearAllMocks(); mocks.requireUser.mockResolvedValue("user_A"); });
  it("uses the verified Clerk owner and rejects a supplied owner field", async () => {
    const invalid = await POST(new Request("http://localhost/api/workouts", { method: "POST", body: JSON.stringify({ ...summary, userId: "user_B" }) }));
    expect(invalid.status).toBe(400);
    mocks.insertWorkout.mockResolvedValue({ created: true });
    const response = await POST(new Request("http://localhost/api/workouts", { method: "POST", body: JSON.stringify(summary) }));
    expect(response.status).toBe(201);
    expect(mocks.insertWorkout).toHaveBeenCalledWith("user_A", summary);
  });
  it("excludes synthetic sessions from cloud statistics", async () => {
    const response = await POST(new Request("http://localhost/api/workouts", { method: "POST", body: JSON.stringify({ ...summary, source: "sample-synthetic" }) }));
    expect(response.status).toBe(400);
    expect(mocks.insertWorkout).not.toHaveBeenCalled();
  });
  it("scopes history to the verified user", async () => {
    mocks.listWorkouts.mockResolvedValue([]);
    const response = await GET(new Request("http://localhost/api/workouts?limit=10"));
    expect(response.status).toBe(200);
    expect(mocks.listWorkouts).toHaveBeenCalledWith("user_A", 10, undefined);
  });
  it("requires authentication before database access", async () => {
    const { AuthError } = await import("@/lib/auth/require-user");
    mocks.requireUser.mockRejectedValue(new AuthError(401, "Sign in is required."));
    const response = await GET(new Request("http://localhost/api/workouts"));
    expect(response.status).toBe(401);
    expect(mocks.listWorkouts).not.toHaveBeenCalled();
  });
});
