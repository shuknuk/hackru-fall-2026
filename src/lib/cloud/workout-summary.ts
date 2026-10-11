import { z } from "zod";
import type { Session } from "@/lib/motion/schema";

const nullableMetric = z.number().finite().min(0).max(180).nullable();
export const workoutSummarySchema = z.object({
  sessionId: z.string().uuid(),
  recordedAt: z.string().datetime(),
  exerciseType: z.literal("bodyweight-squat"),
  source: z.literal("live"),
  status: z.enum(["complete", "interrupted"]),
  repCount: z.number().int().min(0).max(10),
  durationMs: z.number().int().min(0).max(90_000),
  medianKneeBend: nullableMetric,
  kneeVariation: nullableMetric,
  medianAscentMs: z.number().finite().min(0).max(15_000).nullable(),
  trackingCoverage: z.number().finite().min(0).max(1),
  visibleSide: z.enum(["left", "right"]),
  algorithmVersion: z.string().min(1).max(80),
}).strict();
export type WorkoutSummary = z.infer<typeof workoutSummarySchema>;

export function workoutSummary(session: Session): WorkoutSummary {
  if (session.source !== "live" || !["complete", "interrupted"].includes(session.status))
    throw new Error("Only completed or interrupted personal recordings can sync.");
  return workoutSummarySchema.parse({
    sessionId: session.id,
    recordedAt: session.createdAt,
    exerciseType: session.exercise,
    source: session.source,
    status: session.status,
    repCount: session.reps.length,
    durationMs: Math.round(session.samples.at(-1)?.t ?? 0),
    medianKneeBend: session.summary.peak,
    kneeVariation: session.summary.variation,
    medianAscentMs: session.summary.ascent,
    trackingCoverage: session.summary.trackingCoverage,
    visibleSide: session.capture.side,
    algorithmVersion: session.algorithmVersion,
  });
}
