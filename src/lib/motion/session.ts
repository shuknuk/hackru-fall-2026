import {
  ALGORITHM,
  MAX_BYTES,
  sessionSchema,
  type Capture,
  type Profile,
  type Sample,
  type Session,
} from "./schema";
import {
  analyze,
  measure,
  Signal,
  summary,
  trackingCoverage,
} from "./analysis";
import type { Joint } from "../pose/types";
export function prepareSample(
  joints: Joint[],
  capture: Capture,
  t: number,
  signal: Signal,
): Sample {
  const m = measure(joints, capture.side, capture.width, capture.height);
  return {
    t,
    joints: joints.length === 33 ? joints.slice(11) : [],
    ...m,
    filtered: signal.next(m.knee, t),
    valid: m.knee !== null,
    reason: m.knee === null ? "Locked hip, knee or ankle unavailable" : "",
  };
}
export function buildSession(
  samples: Sample[],
  profile: Profile,
  capture: Capture,
  status: Session["status"],
  source: Session["source"] = "live",
  id = crypto.randomUUID(),
): Session {
  const reps = analyze(samples, profile);
  const session = sessionSchema.parse({
    schemaVersion: 1,
    id,
    createdAt: new Date().toISOString(),
    exercise: "bodyweight-squat",
    source,
    status,
    model: "pose-landmarker-lite-float16-v1",
    sdkVersion: "1.1.0",
    algorithmVersion: ALGORITHM,
    profile,
    profileId: profile.id,
    segments: [
      {
        id: "segment-1",
        start: samples[0]?.t ?? 0,
        end: samples[samples.length - 1]?.t ?? 0,
        status,
      },
    ],
    summary: { ...summary(reps), trackingCoverage: trackingCoverage(samples) },
    capture,
    samples,
    reps,
  });
  if (new TextEncoder().encode(JSON.stringify(session)).length > MAX_BYTES)
    throw new Error("Session exceeds the 5 MiB limit");
  return session;
}
export function parseSession(text: string): Session {
  if (new TextEncoder().encode(text).length > MAX_BYTES)
    throw new Error("Import exceeds 5 MiB");
  const session = sessionSchema.parse(JSON.parse(text));
  // Recompute derived measurements and repetitions. Imported aggregate claims are never trusted.
  const signal = new Signal();
  const samples = session.samples.map((s) => {
    const joints: Joint[] = [
      ...Array.from(
        { length: 11 },
        (): Joint => ({ x: 0, y: 0, z: 0, visibility: null, presence: null }),
      ),
      ...s.joints,
    ];
    const next = prepareSample(joints, session.capture, s.t, signal);
    return next;
  });
  const rebuilt = buildSession(
    samples,
    session.profile,
    session.capture,
    session.status,
    session.source,
    session.id,
  );
  rebuilt.createdAt = session.createdAt;
  if (session.importedFrom) rebuilt.importedFrom = session.importedFrom;
  return rebuilt;
}
