import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
vi.mock("./index", () => ({ databasePool: vi.fn() }));
import type { PoolClient } from "pg";
import { insertWorkoutWithClient } from "./workouts";

const summary = {
  sessionId: "10000000-0000-4000-8000-000000000001",
  recordedAt: "2026-10-11T12:00:00.000Z",
  exerciseType: "bodyweight-squat" as const,
  source: "live" as const,
  status: "complete" as const,
  repCount: 3,
  durationMs: 12000,
  medianKneeBend: 65,
  kneeVariation: 3,
  medianAscentMs: 900,
  trackingCoverage: 0.95,
  visibleSide: "left" as const,
  algorithmVersion: "squat-projected-v1",
};
describe("Tiger Data idempotency", () => {
  it("does not insert a second metric row for a repeated session key", async () => {
    const query = vi.fn()
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({ rowCount: 0 })
      .mockResolvedValueOnce({});
    const result = await insertWorkoutWithClient({ query } as unknown as PoolClient, "device_A", summary);
    expect(result).toEqual({ created: false });
    expect(query.mock.calls.some(([sql]) => String(sql).includes("INSERT INTO workout_metrics"))).toBe(false);
  });
});
