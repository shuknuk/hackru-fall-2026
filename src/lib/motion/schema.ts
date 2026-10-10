import { z } from "zod";

export const ALGORITHM = "squat-projected-v1";
export const MAX_SAMPLES = 1801;
export const MAX_BYTES = 5 * 1024 * 1024;
const finite = z.number().finite();
const angle = finite.min(0).max(180).nullable();
export const jointSchema = z
  .object({
    x: finite.min(-10).max(10),
    y: finite.min(-10).max(10),
    z: finite.min(-20).max(20),
    visibility: finite.min(0).max(1).nullable(),
    presence: finite.min(0).max(1).nullable(),
  })
  .strict();
export const profileSchema = z
  .object({
    id: z.string().uuid(),
    algorithmVersion: z.literal(ALGORITHM),
    side: z.enum(["left", "right"]),
    createdAt: z.string().datetime(),
    baseline: finite.min(0).max(160),
    range: finite.min(20).max(180),
    noise: finite.min(0).max(30),
    stand: finite.min(0).max(180),
    down: finite.min(0).max(180),
    qualify: finite.min(0).max(180),
    fingerprint: z.string().min(1).max(160),
  })
  .strict()
  .refine(
    (p) => p.stand < p.down && p.down < p.qualify,
    "Calibration thresholds are unordered",
  )
  .refine(
    (p) =>
      Math.abs(p.stand - (p.baseline + Math.max(5, 0.15 * p.range))) < 1e-6 &&
      Math.abs(p.down - (p.baseline + Math.max(10, 0.3 * p.range))) < 1e-6 &&
      Math.abs(p.qualify - (p.baseline + Math.max(15, 0.65 * p.range))) < 1e-6,
    "Thresholds do not match this algorithm version",
  );
export const captureSchema = z
  .object({
    width: z.number().int().min(1).max(4096),
    height: z.number().int().min(1).max(4096),
    facing: z.enum(["user", "environment"]),
    mirrored: z.boolean(),
    side: z.enum(["left", "right"]),
    engine: z.string().max(80),
  })
  .strict();
export const sampleSchema = z
  .object({
    t: finite.min(0).max(90000),
    joints: z.array(jointSchema).length(22).or(z.array(jointSchema).length(0)),
    knee: angle,
    hip: angle,
    lean: angle,
    filtered: angle,
    valid: z.boolean(),
    reason: z.string().max(120),
  })
  .strict();
export const repSchema = z
  .object({
    id: z.number().int().min(1).max(10),
    segmentId: z.literal("segment-1"),
    start: finite.min(0),
    bottom: finite.min(0),
    end: finite.max(90000),
    coverage: finite.min(0.85).max(1),
    peak: angle,
    hip: angle,
    lean: angle,
    descent: finite.min(0).max(15000),
    ascent: finite.min(0).max(15000),
  })
  .strict()
  .refine(
    (r) =>
      r.start < r.bottom &&
      r.bottom < r.end &&
      r.end - r.start >= 700 &&
      r.end - r.start <= 15000,
    "Invalid repetition anchors",
  );
export const sessionSchema = z
  .object({
    schemaVersion: z.literal(1),
    importedFrom: z.string().uuid().optional(),
    id: z.string().uuid(),
    createdAt: z.string().datetime(),
    exercise: z.literal("bodyweight-squat"),
    source: z.enum(["live", "sample-synthetic", "sample-recorded"]),
    status: z.enum(["complete", "interrupted", "partial"]),
    model: z.literal("pose-landmarker-lite-float16-v1"),
    sdkVersion: z.literal("1.1.0"),
    algorithmVersion: z.literal(ALGORITHM),
    profile: profileSchema,
    profileId: z.string().uuid(),
    segments: z
      .array(
        z
          .object({
            id: z.literal("segment-1"),
            start: finite.min(0),
            end: finite.max(90000),
            status: z.enum(["complete", "interrupted", "partial"]),
          })
          .strict(),
      )
      .length(1),
    summary: z
      .object({
        count: z.number().int().min(0).max(10),
        peak: angle,
        variation: finite.min(0).max(180).nullable(),
        ascent: finite.min(0).max(15000).nullable(),
        coverage: finite.min(0).max(1).nullable(),
        trackingCoverage: finite.min(0).max(1),
      })
      .strict(),
    capture: captureSchema,
    samples: z.array(sampleSchema).min(1).max(MAX_SAMPLES),
    reps: z.array(repSchema).max(10),
  })
  .strict()
  .superRefine((s, ctx) => {
    let last = -1;
    for (const x of s.samples) {
      if (last >= 0 && x.t - last < 50)
        ctx.addIssue({
          code: "custom",
          message: "Sample cadence exceeds 20 Hz",
        });
      if (x.t <= last)
        ctx.addIssue({
          code: "custom",
          message: "Sample timestamps must strictly increase",
        });
      last = x.t;
    }
    if (
      s.profileId !== s.profile.id ||
      s.segments[0].start !== s.samples[0].t ||
      s.segments[0].end !== last ||
      s.segments[0].status !== s.status
    )
      ctx.addIssue({
        code: "custom",
        message: "Profile or segment metadata does not match samples",
      });
    if (s.capture.side !== s.profile.side)
      ctx.addIssue({
        code: "custom",
        message: "Capture and calibration sides differ",
      });
    let end = -1;
    for (const r of s.reps) {
      if (
        [r.start, r.bottom, r.end].some(
          (t) => !s.samples.some((x) => x.t === t && x.valid),
        )
      )
        ctx.addIssue({
          code: "custom",
          message: "A repetition anchor lacks valid sample evidence",
        });
      if (r.start < end || r.end > last)
        ctx.addIssue({
          code: "custom",
          message: "Overlapping or out-of-range repetitions",
        });
      end = r.end;
    }
  });
export type Profile = z.infer<typeof profileSchema>;
export type Capture = z.infer<typeof captureSchema>;
export type Sample = z.infer<typeof sampleSchema>;
export type Rep = z.infer<typeof repSchema>;
export type Session = z.infer<typeof sessionSchema>;
export type Side = Profile["side"];
