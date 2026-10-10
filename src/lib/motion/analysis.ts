import type { Joint } from "../pose/types";
import { jointVisible } from "../pose/types";
import {
  ALGORITHM,
  type Profile,
  type Sample,
  type Rep,
  type Side,
} from "./schema";
export const INDICES = {
  left: [11, 23, 25, 27],
  right: [12, 24, 26, 28],
} as const;
export const CONNECTIONS = [
  [11, 12],
  [11, 13],
  [13, 15],
  [12, 14],
  [14, 16],
  [11, 23],
  [12, 24],
  [23, 24],
  [23, 25],
  [25, 27],
  [27, 29],
  [29, 31],
  [27, 31],
  [24, 26],
  [26, 28],
  [28, 30],
  [30, 32],
  [28, 32],
];
// A valid pose result is evidence that tracking is present even when inference is
// slower than the drawing loop. Four processed frames per second is sufficient
// for the detector's dwell rules; explicit invalid samples still use the much
// shorter loss tolerance below.
export const MAX_VALID_SAMPLE_INTERVAL_MS = 400;
export const MAX_TRACKING_LOSS_MS = 150;
// Two observed standing samples confirm the return; do not require an extra
// quarter-second hold after a completed down-and-up movement.
export const RETURN_TO_STANDING_MS = 80;
export function median(values: number[]): number | null {
  if (!values.length) return null;
  const a = [...values].sort((x, y) => x - y);
  const m = Math.floor(a.length / 2);
  return a.length % 2 ? a[m] : (a[m - 1] + a[m]) / 2;
}
export function mad(values: number[]) {
  const m = median(values);
  return m === null ? null : median(values.map((x) => Math.abs(x - m)));
}
export function angle(
  a: Joint,
  b: Joint,
  c: Joint,
  w: number,
  h: number,
): number | null {
  if (
    ![a.x, a.y, b.x, b.y, c.x, c.y, w, h].every(Number.isFinite) ||
    w <= 0 ||
    h <= 0
  )
    return null;
  const ux = (a.x - b.x) * w,
    uy = (a.y - b.y) * h,
    vx = (c.x - b.x) * w,
    vy = (c.y - b.y) * h;
  const d = Math.hypot(ux, uy) * Math.hypot(vx, vy);
  if (d < 1e-6) return null;
  return (
    (Math.acos(Math.min(1, Math.max(-1, (ux * vx + uy * vy) / d))) * 180) /
    Math.PI
  );
}
export function measure(joints: Joint[], side: Side, w: number, h: number) {
  const [s, hi, k, a] = INDICES[side].map((i) => joints[i]);
  const knee =
    jointVisible(hi) && jointVisible(k) && jointVisible(a)
      ? angle(hi, k, a, w, h)
      : null;
  const hip =
    jointVisible(s) && jointVisible(hi) && jointVisible(k)
      ? angle(s, hi, k, w, h)
      : null;
  const lean =
    jointVisible(s) &&
    jointVisible(hi) &&
    Math.hypot((s.x - hi.x) * w, (s.y - hi.y) * h) > 1e-6
      ? (Math.atan2(Math.abs((s.x - hi.x) * w), Math.abs((s.y - hi.y) * h)) *
          180) /
        Math.PI
      : null;
  return {
    knee: knee === null ? null : 180 - knee,
    hip: hip === null ? null : 180 - hip,
    lean,
  };
}
export function makeProfile(
  baseline: number,
  peak: number,
  side: Side,
  fingerprint: string,
  noise = 0,
): Profile {
  const range = peak - baseline;
  if (range < 20)
    throw new Error(
      "Setup movement is too small to distinguish from noise. Check the camera placement and try your comfortable range again.",
    );
  return {
    id: crypto.randomUUID(),
    algorithmVersion: ALGORITHM,
    createdAt: new Date().toISOString(),
    side,
    baseline,
    range,
    noise,
    stand: baseline + Math.max(5, 0.15 * range),
    down: baseline + Math.max(10, 0.3 * range),
    qualify: baseline + Math.max(15, 0.65 * range),
    fingerprint,
  };
}
export class Signal {
  private time = -1;
  private value: number | null = null;
  next(x: number | null, t: number) {
    if (t <= this.time) throw new Error("Non-increasing capture timestamp");
    const dt = this.time < 0 ? 0 : t - this.time;
    this.time = t;
    if (x === null) {
      this.value = null;
      return null;
    }
    this.value =
      this.value === null || dt > 500
        ? x
        : this.value + (1 - Math.exp(-dt / 80)) * (x - this.value);
    return this.value;
  }
}
export class SquatDetector {
  readonly reps: Rep[] = [];
  phase: "unarmed" | "standing" | "descending" | "ascending" = "unarmed";
  private standingSince: number | null = null;
  private directionSince: number | null = null;
  private last: Sample | null = null;
  private lastStanding: Sample | null = null;
  private candidate: {
    start: number;
    bottom: number;
    peak: number;
    hip: number | null;
    lean: number | null;
    validMs: number;
    qualified: boolean;
  } | null = null;
  private gapStart: number | null = null;
  private gapValue: number | null = null;
  constructor(readonly profile: Profile) {}
  reset() {
    this.phase = "unarmed";
    this.candidate = null;
    this.standingSince = null;
    this.directionSince = null;
    this.lastStanding = null;
  }
  push(s: Sample): Rep | null {
    const prev = this.last;
    if (prev && s.t <= prev.t)
      throw new Error("Non-increasing detector timestamp");
    this.last = s;
    const gap = prev ? s.t - prev.t : 0;
    if (gap > MAX_VALID_SAMPLE_INTERVAL_MS) {
      this.reset();
      this.gapStart = null;
    }
    if (!s.valid || s.filtered === null) {
      if (this.gapStart === null) {
        this.gapStart = prev?.t ?? s.t;
        this.gapValue = prev?.filtered ?? null;
      }
      if (s.t - this.gapStart > MAX_TRACKING_LOSS_MS) this.reset();
      return null;
    }
    const x = s.filtered,
      p = this.profile;
    if (this.gapStart !== null) {
      const crossed =
        this.gapValue !== null &&
        [p.stand, p.down, p.qualify].some(
          (t) => (this.gapValue! - t) * (x - t) <= 0,
        );
      if (s.t - this.gapStart > MAX_TRACKING_LOSS_MS || crossed) this.reset();
      this.gapStart = null;
    }
    if (this.candidate && s.t - this.candidate.start > 15000) this.reset();
    if (this.phase === "unarmed") {
      if (x <= p.stand) {
        this.standingSince ??= s.t;
        if (s.t - this.standingSince >= 250) {
          this.phase = "standing";
          this.lastStanding = s;
        }
      } else this.standingSince = null;
      return null;
    }
    if (this.phase === "standing") {
      if (x <= p.stand) {
        this.lastStanding = s;
        this.directionSince = null;
      } else if (x >= p.down) {
        this.directionSince ??= s.t;
        if (s.t - this.directionSince >= 120 && this.lastStanding) {
          this.candidate = {
            start: this.lastStanding.t,
            bottom: s.t,
            peak: x,
            hip: s.hip,
            lean: s.lean,
            validMs: s.t - this.lastStanding.t,
            qualified: x >= p.qualify,
          };
          this.phase = "descending";
          this.standingSince = null;
          this.directionSince = null;
        }
      } else this.directionSince = null;
      return null;
    }
    const c = this.candidate!;
    if (prev?.valid && gap <= MAX_VALID_SAMPLE_INTERVAL_MS) c.validMs += gap;
    if (x > c.peak) {
      c.peak = x;
      c.bottom = s.t;
      c.hip = s.hip;
      c.lean = s.lean;
      this.directionSince = null;
    }
    if (x >= p.qualify) c.qualified = true;
    if (this.phase === "descending") {
      if (x <= p.stand && !c.qualified) {
        this.reset();
        return null;
      }
      if (c.qualified && x < c.peak - 4) {
        this.directionSince ??= s.t;
        if (s.t - this.directionSince >= 120) {
          this.phase = "ascending";
          this.standingSince = null;
        }
      } else this.directionSince = null;
    }
    if (this.phase === "ascending") {
      if (x <= p.stand) {
        this.standingSince ??= s.t;
        if (s.t - this.standingSince >= RETURN_TO_STANDING_MS) {
          const duration = s.t - c.start,
            coverage = Math.min(1, c.validMs / duration);
          let rep: Rep | null = null;
          if (
            duration >= 700 &&
            duration <= 15000 &&
            coverage >= 0.85 &&
            c.bottom > c.start &&
            c.bottom < s.t &&
            this.reps.length < 10
          ) {
            rep = {
              id: this.reps.length + 1,
              segmentId: "segment-1",
              start: c.start,
              bottom: c.bottom,
              end: s.t,
              coverage,
              peak: c.peak,
              hip: c.hip,
              lean: c.lean,
              descent: c.bottom - c.start,
              ascent: s.t - c.bottom,
            };
            this.reps.push(rep);
          }
          this.reset();
          this.phase = "standing";
          this.lastStanding = s;
          return rep;
        }
      } else this.standingSince = null;
    }
    return null;
  }
}
export function analyze(samples: Sample[], profile: Profile) {
  const d = new SquatDetector(profile);
  for (const s of samples) d.push(s);
  return d.reps;
}
export function summary(reps: Rep[]) {
  return {
    count: reps.length,
    peak: median(reps.flatMap((r) => (r.peak === null ? [] : [r.peak]))),
    variation: mad(reps.flatMap((r) => (r.peak === null ? [] : [r.peak]))),
    ascent: median(reps.map((r) => r.ascent)),
    coverage: median(reps.map((r) => r.coverage)),
  };
}

export function trackingCoverage(samples: Sample[]) {
  let valid = 0;
  for (let i = 1; i < samples.length; i++) {
    const a = samples[i - 1],
      b = samples[i],
      dt = b.t - a.t;
    if (a.valid && b.valid && dt <= MAX_VALID_SAMPLE_INTERVAL_MS) valid += dt;
  }
  const duration = samples.length
    ? samples[samples.length - 1].t - samples[0].t
    : 0;
  return duration > 0 ? valid / duration : 0;
}
