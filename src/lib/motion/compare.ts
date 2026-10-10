import type { Session, Rep, Sample } from "./schema";
import { MAX_VALID_SAMPLE_INTERVAL_MS, summary } from "./analysis";
export function compatibility(a: Session, b: Session, confirmed: boolean) {
  const reasons: string[] = [];
  if (
    a.exercise !== b.exercise ||
    a.algorithmVersion !== b.algorithmVersion ||
    a.sdkVersion !== b.sdkVersion ||
    a.model !== b.model
  )
    reasons.push("Exercise, model or algorithm versions differ.");
  if (a.source !== b.source)
    reasons.push("Live and sample sources cannot be mixed.");
  if (a.capture.side !== b.capture.side)
    reasons.push("Locked anatomical sides differ.");
  if (
    ["baseline", "range", "noise", "stand", "down", "qualify"].some(
      (k) =>
        a.profile[k as keyof typeof a.profile] !==
        b.profile[k as keyof typeof b.profile],
    ) ||
    a.profile.id !== b.profile.id ||
    a.profile.fingerprint !== b.profile.fingerprint
  )
    reasons.push("Calibration or camera setup differs.");
  if (
    a.capture.facing !== b.capture.facing ||
    a.capture.width / a.capture.height !== b.capture.width / b.capture.height
  )
    reasons.push("Camera selection or orientation differs.");
  if (!a.reps.length || !b.reps.length)
    reasons.push("Both sets need completed repetitions.");
  if (reasons.length)
    return { status: "Cannot compare", reasons, allowed: false };
  if (!confirmed)
    return {
      status: "Limited comparison",
      reasons: [
        "Confirm the same person and comparable camera placement before viewing numerical differences.",
      ],
      allowed: false,
    };
  if (a.importedFrom || b.importedFrom)
    return {
      status: "Limited comparison",
      reasons: [
        "Imported source declarations cannot be independently verified. Only recomputed completed repetitions are compared.",
      ],
      allowed: true,
    };
  if (a.status !== "complete" || b.status !== "complete")
    return {
      status: "Limited comparison",
      reasons: [
        "At least one set was interrupted. Only completed repetitions are compared.",
      ],
      allowed: true,
    };
  return {
    status: "Comparable",
    reasons: [
      "Settings match. Single-camera estimates remain sensitive to placement and tracking.",
    ],
    allowed: true,
  };
}
export function alignedTime(rep: Rep, progress: number) {
  if (rep.start >= rep.bottom || rep.bottom >= rep.end)
    throw new Error("Degenerate phase anchors");
  const p = Math.max(0, Math.min(1, progress));
  return p <= 0.5
    ? rep.start + (rep.bottom - rep.start) * p * 2
    : rep.bottom + (rep.end - rep.bottom) * (p - 0.5) * 2;
}
export function sampleAt(samples: Sample[], time: number): Sample | null {
  let lo = 0,
    hi = samples.length - 1;
  while (lo < hi) {
    const m = Math.ceil((lo + hi) / 2);
    if (samples[m].t <= time) lo = m;
    else hi = m - 1;
  }
  const a = samples[lo],
    b = samples[lo + 1];
  if (!a || time < a.t) return null;
  if (time === a.t) return a.valid ? a : null;
  if (
    !b ||
    !a.valid ||
    !b.valid ||
    b.t - a.t > MAX_VALID_SAMPLE_INTERVAL_MS ||
    a.joints.length !== 22 ||
    b.joints.length !== 22
  )
    return null;
  const f = (time - a.t) / (b.t - a.t);
  const mix = (x: number | null, y: number | null) =>
    x === null || y === null ? null : x + (y - x) * f;
  return {
    ...a,
    t: time,
    knee: mix(a.knee, b.knee),
    filtered: mix(a.filtered, b.filtered),
    hip: mix(a.hip, b.hip),
    lean: mix(a.lean, b.lean),
    joints: a.joints.map((j, i) => {
      const k = b.joints[i];
      return {
        ...j,
        x: j.x + (k.x - j.x) * f,
        y: j.y + (k.y - j.y) * f,
        z: j.z + (k.z - j.z) * f,
        visibility:
          j.visibility === null || k.visibility === null
            ? null
            : Math.min(j.visibility, k.visibility),
        presence:
          j.presence === null || k.presence === null
            ? null
            : Math.min(j.presence, k.presence),
      };
    }),
  };
}
export function observations(a: Session, b: Session) {
  const x = summary(a.reps),
    y = summary(b.reps);
  const angleGate = Math.max(5, 3 * Math.max(a.profile.noise, b.profile.noise));
  const items: { metric: string; text: string }[] = [];
  if (Math.min(a.summary.trackingCoverage, b.summary.trackingCoverage) < 0.85)
    items.push({
      metric: "set-tracking-coverage",
      text: `Tracking was available during ${Math.round(a.summary.trackingCoverage * 100)}% of Set A and ${Math.round(b.summary.trackingCoverage * 100)}% of Set B. Movement differences below use only completed repetitions.`,
    });
  if (x.peak !== null && y.peak !== null) {
    const d = y.peak - x.peak;
    items.push({
      metric: "median-peak-knee",
      text:
        Math.abs(d) >= angleGate
          ? `Set B showed about ${Math.round(Math.abs(d))}° ${d > 0 ? "more" : "less"} estimated knee flexion at the bottom.`
          : `The estimated knee-flexion difference is smaller than the ${Math.round(angleGate)}° sensitivity gate.`,
    });
  }
  if (x.ascent !== null && y.ascent !== null) {
    const d = (y.ascent - x.ascent) / 1000;
    items.push({
      metric: "median-ascent-duration",
      text:
        Math.abs(d) >= 0.2
          ? `The median ascent in Set B took about ${Math.abs(d).toFixed(1)} seconds ${d > 0 ? "longer" : "less"}.`
          : "Median ascent times differed by less than 0.2 seconds.",
    });
  }
  if (
    x.variation !== null &&
    y.variation !== null &&
    a.reps.length >= 3 &&
    b.reps.length >= 3
  ) {
    const d = y.variation - x.variation;
    items.push({
      metric: "knee-peak-mad",
      text:
        Math.abs(d) >= angleGate
          ? `Estimated knee bend varied ${d > 0 ? "more" : "less"} between repetitions in Set B.`
          : "Between-repetition bend variation is similar within the sensitivity gate.",
    });
  }
  return items.slice(0, 3);
}
export function spatialReference(session: Session) {
  const hip = session.capture.side === "left" ? 12 : 13,
    knee = hip + 2,
    ankle = hip + 4;
  const baseline = session.samples.filter(
    (s) =>
      s.valid &&
      s.t <= session.samples[0].t + 1500 &&
      (s.filtered ?? 180) <= session.profile.stand &&
      s.joints.length === 22,
  );
  if (baseline.length < 5) return null;
  const x: number[] = [],
    y: number[] = [],
    length: number[] = [];
  for (const s of baseline) {
    const h = s.joints[hip],
      k = s.joints[knee],
      a = s.joints[ankle];
    x.push(h.x * session.capture.width);
    y.push(h.y * session.capture.height);
    length.push(
      Math.hypot(
        (h.x - k.x) * session.capture.width,
        (h.y - k.y) * session.capture.height,
      ) +
        Math.hypot(
          (k.x - a.x) * session.capture.width,
          (k.y - a.y) * session.capture.height,
        ),
    );
  }
  const mid = (v: number[]) =>
    [...v].sort((a, b) => a - b)[Math.floor(v.length / 2)];
  const l = mid(length);
  return l > 1 ? { x: mid(x), y: mid(y), scale: 180 / l } : null;
}
export function comparisonPose(
  session: Session,
  sample: Sample | null,
  ref: ReturnType<typeof spatialReference>,
) {
  if (!sample || !ref) return null;
  return {
    ...sample,
    joints: sample.joints.map((j) => ({
      ...j,
      x: ((j.x * session.capture.width - ref.x) * ref.scale + 320) / 640,
      y: ((j.y * session.capture.height - ref.y) * ref.scale + 210) / 480,
    })),
  };
}
