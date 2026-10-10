import { z } from "zod";

export const coachMetricIdSchema = z.enum([
  "set-tracking-coverage",
  "median-peak-knee",
  "median-ascent-duration",
  "knee-peak-mad",
]);

const setMetricsSchema = z
  .object({
    completedReps: z.number().int().min(1).max(10),
    trackingCoverage: z.number().min(0).max(1),
    medianKneeFlexion: z.number().min(0).max(180).nullable(),
    medianAscentMs: z.number().min(0).max(15000).nullable(),
  })
  .strict();

export const coachRequestSchema = z
  .object({
    setA: setMetricsSchema,
    setB: setMetricsSchema,
    evidence: z
      .array(
        z
          .object({
            metricId: coachMetricIdSchema,
            deterministicText: z.string().min(1).max(400),
          })
          .strict(),
      )
      .min(1)
      .max(3),
  })
  .strict()
  .refine(
    (input) =>
      new Set(input.evidence.map((item) => item.metricId)).size ===
      input.evidence.length,
    "Evidence metric IDs must be unique",
  );

export const coachResponseSchema = z
  .object({
    headline: z.string().min(1).max(120),
    explanations: z
      .array(
        z
          .object({
            metricId: coachMetricIdSchema,
            text: z.string().min(1).max(320),
          })
          .strict(),
      )
      .min(1)
      .max(3),
    caveat: z.string().min(1).max(240),
  })
  .strict();

export type CoachRequest = z.infer<typeof coachRequestSchema>;
export type CoachResponse = z.infer<typeof coachResponseSchema>;

export function parseGroundedCoachResponse(
  value: unknown,
  allowedMetricIds: CoachRequest["evidence"][number]["metricId"][],
) {
  const response = coachResponseSchema.parse(value);
  const allowed = new Set(allowedMetricIds);
  if (
    response.explanations.some((item) => !allowed.has(item.metricId)) ||
    new Set(response.explanations.map((item) => item.metricId)).size !==
      response.explanations.length
  )
    throw new Error("Coach response is not grounded in submitted evidence");
  return response;
}

export function coachPrompt(input: CoachRequest) {
  return `You explain a comparison of two short bodyweight-squat sets using only the JSON evidence below.

Rules:
- Do not calculate or change measurements, repetition counts, metric IDs, or tracking validity.
- Do not infer body parts, causes, injuries, safety, diagnoses, or exercise prescriptions.
- Explain only the supplied evidence. More movement is not automatically better movement.
- Return one explanation per useful supplied metric, at most three, and copy its metricId exactly.
- The caveat must say these are single-camera movement estimates, not a medical assessment.

Evidence JSON:
${JSON.stringify(input)}`;
}
