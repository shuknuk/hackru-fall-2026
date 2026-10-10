import { it, expect } from "vitest";
import { samplePair } from "./fixtures";
import {
  compatibility,
  alignedTime,
  sampleAt,
  observations,
  spatialReference,
  comparisonPose,
} from "./compare";
it("requires matching provenance and setup before deltas", () => {
  const [a, b] = samplePair();
  expect(compatibility(a, b, false).allowed).toBe(false);
  expect(compatibility(a, b, true).status).toBe("Comparable");
  expect(compatibility(a, { ...b, source: "live" }, true).allowed).toBe(false);
  expect(
    compatibility(
      a,
      { ...b, profile: { ...b.profile, id: crypto.randomUUID() } },
      true,
    ).allowed,
  ).toBe(true);
  expect(compatibility(a, { ...b, reps: [] }, true).allowed).toBe(false);
});
it("aligns unequal phases without changing original durations", () => {
  const [a, b] = samplePair();
  for (const s of [a, b]) {
    const r = s.reps[0];
    expect(alignedTime(r, 0)).toBe(r.start);
    expect(alignedTime(r, 0.5)).toBe(r.bottom);
    expect(alignedTime(r, 1)).toBe(r.end);
  }
  expect(() =>
    alignedTime({ ...a.reps[0], bottom: a.reps[0].start }, 0.2),
  ).toThrow();
});
it("does not interpolate through invalid or long gaps", () => {
  const [a] = samplePair();
  expect(sampleAt(a.samples, 25)?.valid).toBe(true);
  expect(
    sampleAt([{ ...a.samples[0], valid: false }, a.samples[1]], 25),
  ).toBeNull();
  expect(sampleAt([a.samples[0], { ...a.samples[1], t: 500 }], 200)).toBeNull();
});
it("reports delta directions from median evidence and preserves vertical movement", () => {
  const [a, b] = samplePair();
  expect(observations(a, b)[0].text).toContain("more");
  const ref = spatialReference(a)!;
  const first = a.samples[0],
    moved = {
      ...first,
      joints: first.joints.map((j) => ({ ...j, y: j.y + 0.1 })),
    };
  const x = comparisonPose(a, first, ref)!,
    y = comparisonPose(a, moved, ref)!;
  expect(y.joints[12].y - x.joints[12].y).toBeGreaterThan(0.05);
});

it("permits confirmed separately calibrated left sets but keeps actual camera and side gates", () => {
  const [a, b] = samplePair();
  const recalibrated = { ...b, profile: { ...b.profile, id: crypto.randomUUID(), baseline: 2, range: 60, fingerprint: "new-calibration" } };
  expect(compatibility(a, recalibrated, false).allowed).toBe(false);
  expect(compatibility(a, recalibrated, true)).toMatchObject({ allowed: true, status: "Limited comparison" });
  expect(compatibility(a, { ...recalibrated, capture: { ...b.capture, side: "right" } }, true).allowed).toBe(false);
  expect(compatibility(a, { ...recalibrated, capture: { ...b.capture, facing: "user" } }, true).allowed).toBe(false);
});
