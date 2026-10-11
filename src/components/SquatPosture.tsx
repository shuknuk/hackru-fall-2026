"use client";
import { useMemo } from "react";
import type { Session } from "@/lib/motion/schema";
import { postureFeedback } from "@/lib/motion/posture";
import { fixtureSamples, squatDemoJoints, SAMPLE_CAPTURE } from "@/lib/motion/fixtures";
import { makeProfile } from "@/lib/motion/analysis";
import { buildSession } from "@/lib/motion/session";
import ReplayPlayer from "./ReplayPlayer";

export default function SquatPosture({ session }: { session: Session }) {
  const feedback = useMemo(() => postureFeedback(session), [session]);
  const example = useMemo(() => buildSession(
    fixtureSamples([90], 1500, 1500, squatDemoJoints),
    makeProfile(0, 90, "left", "results-reference-only"),
    SAMPLE_CAPTURE, "complete", "sample-synthetic",
  ), []);
  return (
    <section aria-labelledby="posture-title">
      <h3 id="posture-title">Squat posture feedback</h3>
      <p><strong>{feedback.state === "pass" ? "Visible posture checks passed" : feedback.state === "review" ? "Your squat posture needs attention" : "Not enough clear tracking to assess all posture checks"}</strong></p>
      <p>These checks look at completed squats from your side view. They cannot certify correct form or safety, or assess spine curvature, knee alignment from the front, or balance.</p>
      {!feedback.reps.length ? <p>Record a completed squat with your shoulders, hips, knees, heels and toes visible to receive feedback.</p> : null}
      {feedback.reps.map((rep) => (
        <details key={rep.id} open={rep.checks.some((check) => check.state === "review")}>
          <summary>Rep {rep.id}: {rep.checks.some((check) => check.state === "review") ? "Needs attention" : rep.checks.some((check) => check.state === "unknown") ? "Some checks unavailable" : "Checks passed"}</summary>
          <ul>{rep.checks.map((check) => <li key={check.name}>
            <strong>{check.name}: {check.state === "pass" ? "Matched" : check.state === "review" ? "Review" : "Cannot assess"}</strong>
            <p>{check.detail}</p>
            {check.state === "review" ? <p>{check.cue}</p> : null}
          </li>)}</ul>
        </details>
      ))}
      <details open={feedback.state === "review"}>
        <summary>See a reference squat animation</summary>
        <p>This authored skeleton demonstrates bending at the hips and knees, keeping the feet planted, and returning to standing. Press Play to see one slow squat.</p>
        <p>The example reaches roughly thigh-parallel depth. Its hip and knee angles illustrate one squat, not targets you must copy. Use your comfortable range; there is no single ideal angle for every body.</p>
        <ReplayPlayer session={example} />
      </details>
      <details>
        <summary>How these checks work and their sources</summary>
        <p>Angles are 2D estimates, measured from standing (0 degrees means straight). We check an observable hip-bend change of at least 15 degrees alongside knee bend, a return within 15 degrees of your standing hip angle, and a heel-to-toe slope change of no more than 0.2. These are provisional app tolerances, not research-validated correctness scores. At least three clear samples per window and 90% rep tracking are required. Missing evidence is reported as unavailable.</p>
        <p>Technique cues come from <a href="https://pmc.ncbi.nlm.nih.gov/articles/PMC4262933/" target="_blank" rel="noreferrer">Myer et al.: bodyweight squat assessment</a>. Depth and joint angles vary with technique and body proportions; see <a href="https://pmc.ncbi.nlm.nih.gov/articles/PMC10987311/" target="_blank" rel="noreferrer">the squat biomechanics review</a>.</p>
        <p>Only completed repetitions are assessed. This feedback does not affect rep counting, calibration or saved measurements.</p>
      </details>
    </section>
  );
}
