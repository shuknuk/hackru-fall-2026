import { expect, it } from "vitest";
import { samplePair, squatDemoJoints } from "./fixtures";
it("creates two three-rep squat demos with planted feet and lowering hips", () => {
  const standing = squatDemoJoints(0), bottom = squatDemoJoints(65);
  expect(bottom[27]).toEqual(standing[27]);
  expect(bottom[23].y).toBeGreaterThan(standing[23].y);
  for (const set of samplePair()) {
    expect(set.source).toBe("sample-synthetic");
    expect(set.exercise).toBe("bodyweight-squat");
    expect(set.reps).toHaveLength(3);
  }
});
