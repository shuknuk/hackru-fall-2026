import { expect, it } from "vitest";
import { samplePair } from "./fixtures";
import { advanceSquatReplay, squatReplayTime } from "./replay";
it("whole-set replay skips leading setup, pauses, and trailing partial movement", () => {
  const [session] = samplePair();
  const reps = session.reps;
  expect(squatReplayTime(reps, 0)).toBe(reps[0].start);
  expect(squatReplayTime(reps, reps[0].end + 10)).toBe(reps[1].start);
  expect(advanceSquatReplay(reps, reps[0].end - 20, 50)).toBeCloseTo(reps[1].start + 30);
  expect(advanceSquatReplay(reps, reps[2].end - 20, 100)).toBe(reps[2].end);
  expect(squatReplayTime([], 500)).toBe(0);
});
