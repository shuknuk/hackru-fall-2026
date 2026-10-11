import { expect, it } from "vitest";
import { postureFeedback } from "./posture";
import { fixtureSamples, squatDemoJoints, SAMPLE_CAPTURE } from "./fixtures";
import { makeProfile } from "./analysis";
import { buildSession } from "./session";
function example(peak = 90) {
  return buildSession(fixtureSamples([peak], 1500, 1500, squatDemoJoints), makeProfile(0, peak, "left", "posture-test"), SAMPLE_CAPTURE, "complete", "sample-synthetic");
}
it("assesses visible cues without requiring a universal depth or mutating a set", () => {
  for (const peak of [45, 90]) {
    const session = example(peak), original = JSON.stringify(session);
    expect(postureFeedback(session).state).toBe("pass");
    expect(JSON.stringify(session)).toBe(original);
  }
});
it("flags a missing hip bend independently of a completed knee cycle", () => {
  const session = example();
  session.samples.forEach((s) => { s.hip = 15; });
  const result = postureFeedback(session);
  expect(result.state).toBe("review");
  expect(result.reps[0].checks[0].state).toBe("review");
  expect(session.reps).toHaveLength(1);
});
it("flags a projected heel lift and supports either anatomical side", () => {
  for (const side of ["left", "right"] as const) {
    const session = example();
    session.capture.side = side; session.profile.side = side;
    const heel = side === "left" ? 18 : 19;
    const rep = session.reps[0];
    session.samples.filter((s) => Math.abs(s.t - rep.bottom) <= 150).forEach((s) => { s.joints[heel].y -= 0.05; });
    expect(postureFeedback(session).reps[0].checks[1].state).toBe("review");
  }
});
it("reports missing foot evidence and low tracking as uncertainty, never correctness", () => {
  const session = example();
  session.samples.forEach((s) => { s.joints[18].visibility = 0.1; });
  expect(postureFeedback(session).state).toBe("unknown");
  session.reps[0].coverage = 0.86;
  expect(postureFeedback(session).reps[0].checks.every((check) => check.state === "unknown")).toBe(true);
  session.reps = [];
  expect(postureFeedback(session)).toEqual({ reps: [], state: "unknown" });
});
it("flags hips that remain bent when the knee cycle has completed", () => {
  const session = example(), rep = session.reps[0];
  session.samples.filter((s) => s.t <= rep.end && s.t >= rep.end - 200).forEach((s) => { s.hip = 65; });
  expect(postureFeedback(session).reps[0].checks[2].state).toBe("review");
});
