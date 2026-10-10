import { describe, expect, it } from "vitest";
import {
  coachPrompt,
  coachRequestSchema,
  parseGroundedCoachResponse,
  type CoachRequest,
} from "./coach";

const request: CoachRequest = {
  setA: {
    completedReps: 3,
    trackingCoverage: 0.94,
    medianKneeFlexion: 64,
    medianAscentMs: 1100,
  },
  setB: {
    completedReps: 3,
    trackingCoverage: 0.96,
    medianKneeFlexion: 70,
    medianAscentMs: 900,
  },
  evidence: [
    {
      metricId: "median-peak-knee",
      deterministicText: "Set B showed about 6° more estimated knee flexion.",
    },
  ],
};

describe("grounded coach boundary", () => {
  it("accepts only bounded aggregate metrics and excludes pose payloads", () => {
    expect(coachRequestSchema.parse(request)).toEqual(request);
    expect(() =>
      coachRequestSchema.parse({ ...request, landmarks: [{ x: 0, y: 0 }] }),
    ).toThrow();
    expect(coachPrompt(request)).not.toContain("sessionId");
  });

  it("rejects generated claims without a submitted metric ID", () => {
    expect(() =>
      parseGroundedCoachResponse(
        {
          headline: "Measured change",
          explanations: [
            { metricId: "median-ascent-duration", text: "It was faster." },
          ],
          caveat: "Single-camera estimate; not a medical assessment.",
        },
        ["median-peak-knee"],
      ),
    ).toThrow("not grounded");
  });
});
