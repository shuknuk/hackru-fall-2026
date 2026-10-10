import { describe, it, expect } from "vitest";
import {
  angle,
  measure,
  makeProfile,
  analyze,
  Signal,
  summary,
} from "./analysis";
import { fixtureSamples, syntheticJoints, samplePair } from "./fixtures";
import { parseSession } from "./session";
import { sessionSchema } from "./schema";
const joint = (x: number, y: number) => ({
  x,
  y,
  z: 0,
  visibility: 1,
  presence: 1,
});
const profile = makeProfile(0, 65, "left", "fixture");
describe("projected geometry", () => {
  it("corrects a nonsquare image and handles straight, right and degenerate limbs", () => {
    expect(angle(joint(0.5, 0), joint(0, 0), joint(0, 1), 640, 480)).toBe(90);
    expect(
      angle(joint(0.5, 0), joint(0, 0), joint(0.5, 1), 640, 480),
    ).toBeCloseTo(56.3099, 3);
    expect(angle(joint(0, 0), joint(0.5, 0), joint(1, 0), 640, 480)).toBe(180);
    expect(angle(joint(0, 0), joint(0, 0), joint(1, 0), 640, 480)).toBeNull();
    expect(angle(joint(NaN, 0), joint(0, 0), joint(1, 0), 640, 480)).toBeNull();
  });
  it("maps both anatomical sides and preserves knee evidence when shoulder is lost", () => {
    const j = syntheticJoints(60);
    expect(measure(j, "left", 640, 480).knee).toBeCloseTo(60);
    expect(measure(j, "right", 640, 480).knee).toBeCloseTo(60);
    j[11].visibility = 0;
    expect(measure(j, "left", 640, 480).hip).toBeNull();
    expect(measure(j, "left", 640, 480).knee).toBeCloseTo(60);
  });
});
describe("squat segmentation", () => {
  it("counts three analytical down/up cycles once and excludes partials", () => {
    expect(analyze(fixtureSamples(), profile)).toHaveLength(3);
    expect(analyze(fixtureSamples([10, 65, 12]), profile)).toHaveLength(1);
  });
  it("does not count a final descent, a long tracking gap or a threshold crossed across a gap", () => {
    const s = fixtureSamples([65]);
    expect(
      analyze(
        s.filter((x) => x.t < 1500),
        profile,
      ),
    ).toHaveLength(0);
    const broken = s.map((x) =>
      x.t >= 1200 && x.t <= 1550 ? { ...x, valid: false, filtered: null } : x,
    );
    expect(analyze(broken, profile)).toHaveLength(0);
    const gap = s.filter((x) => x.t < 1000 || x.t > 1800);
    expect(analyze(gap, profile)).toHaveLength(0);
  });
  it("rejects reversed timestamps and insufficient calibration", () => {
    expect(() =>
      analyze([fixtureSamples()[0], fixtureSamples()[0]], profile),
    ).toThrow();
    expect(() => makeProfile(0, 10, "left", "fixture")).toThrow();
  });
  it("resets filtering across invalid input and handles variable timing", () => {
    const f = new Signal();
    expect(f.next(0, 0)).toBe(0);
    expect(f.next(80, 80)).toBeCloseTo(50.5696, 3);
    expect(f.next(null, 100)).toBeNull();
    expect(f.next(30, 150)).toBe(30);
  });
  it("keeps a bottom hold and bounce as one rep", () => {
    const s = fixtureSamples([65]);
    const bottom = s.findIndex((x) => x.t === 1700);
    const held = [
      ...s.slice(0, bottom),
      ...Array.from({ length: 20 }, (_, i) => ({
        ...s[bottom],
        t: 1700 + i * 50,
      })),
      ...s.slice(bottom).map((x) => ({ ...x, t: x.t + 1000 })),
    ];
    expect(analyze(held, profile)).toHaveLength(1);
    const bounced = s.map((x) =>
      x.t > 1650 && x.t < 2000
        ? { ...x, filtered: 60 + (x.t % 100 ? 2 : 0) }
        : x,
    );
    expect(analyze(bounced, profile)).toHaveLength(1);
  });
});
describe("bounded session validation", () => {
  it("recomputes imported totals, rejects unsupported versions and timestamps", () => {
    const [a] = samplePair();
    expect(a.reps).toHaveLength(3);
    a.createdAt = "2026-01-01T00:00:00.000Z";
    expect(parseSession(JSON.stringify(a)).createdAt).toBe(a.createdAt);
    expect(parseSession(JSON.stringify(a)).reps).toHaveLength(3);
    expect(() => sessionSchema.parse({ ...a, schemaVersion: 2 })).toThrow();
    expect(() =>
      parseSession(
        JSON.stringify({ ...a, samples: [a.samples[1], a.samples[0]] }),
      ),
    ).toThrow();
    const forged = { ...a, reps: [] };
    expect(parseSession(JSON.stringify(forged)).reps).toHaveLength(3);
    expect(() => parseSession(" ".repeat(5 * 1024 * 1024 + 1))).toThrow(
      "5 MiB",
    );
  });
  it("uses medians and variation from completed reps", () => {
    const [a] = samplePair();
    expect(summary(a.reps).count).toBe(3);
    expect(summary(a.reps).variation).toBeCloseTo(0, 0);
  });
});
it("does not arm from standing jitter and tolerates valid 10 Hz sampling", () => {
  const noise = fixtureSamples([0]).map((s, i) => ({
    ...s,
    filtered: 4 + Math.sin(i) * 3,
  }));
  expect(analyze(noise, profile)).toHaveLength(0);
  expect(
    analyze(
      fixtureSamples().filter((_, i) => i % 2 === 0),
      profile,
    ),
  ).toHaveLength(3);
});
it("preserves a short non-transition gap and rearms after an invalid cycle", () => {
  const short = fixtureSamples([65]).map((s) =>
    s.t === 1750 ? { ...s, valid: false, filtered: null } : s,
  );
  expect(analyze(short, profile)).toHaveLength(1);
  const broken = fixtureSamples().map((s) =>
    s.t >= 1300 && s.t <= 1600 ? { ...s, valid: false, filtered: null } : s,
  );
  expect(analyze(broken, profile)).toHaveLength(2);
});
it("rejects calibration-policy tampering and overlarge sample arrays", () => {
  const [a] = samplePair();
  expect(() =>
    sessionSchema.parse({ ...a, profile: { ...a.profile, down: 30 } }),
  ).toThrow();
  expect(() =>
    sessionSchema.parse({
      ...a,
      samples: Array.from({ length: 1802 }, (_, i) => ({
        ...a.samples[0],
        t: i * 50,
      })),
    }),
  ).toThrow();
});
