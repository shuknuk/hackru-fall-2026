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
    <section className={`posture-feedback posture-feedback--${feedback.state}`} aria-labelledby="posture-title">
      <h3 id="posture-title">Squat posture feedback</h3>
      <p><strong>{feedback.state === "pass" ? "Your squats looked consistent with these movement cues" : feedback.state === "review" ? "Here is what to work on next time" : "We could not see enough of your movement to give complete feedback"}</strong></p>
      <p>We look at how you lower and stand back up from the side. One camera cannot show everything about your posture or tell you whether an exercise is safe for you.</p>
      {!feedback.reps.length ? <p>Record a completed squat with your shoulders, hips, knees, heels and toes visible to receive feedback.</p> : null}
      {feedback.reps.map((rep) => {
        const repState = rep.checks.some((check) => check.state === "review") ? "review" : rep.checks.some((check) => check.state === "unknown") ? "unknown" : "pass";
        return (
        <details key={rep.id} data-feedback={repState} open={repState === "review"}>
          <summary>Rep {rep.id}: {rep.checks.some((check) => check.state === "review") ? "Needs attention" : rep.checks.some((check) => check.state === "unknown") ? "We could not see everything clearly" : "Looked good in this view"}</summary>
          <ul>{rep.checks.map((check) => <li key={check.name}>
            <strong>{check.name}: {check.state === "pass" ? "Looked good" : check.state === "review" ? "Try this next time" : "Could not see clearly"}</strong>
            <p>{check.detail}</p>
            {check.state === "review" ? <p>{check.cue}</p> : null}
          </li>)}</ul>
        </details>
      );})}
      <details open={feedback.state === "review"}>
        <summary>See an example squat</summary>
        <p>Press Play to watch a slow example: bend your hips and knees, keep your feet on the floor, then stand back up.</p>
        <p>This is a demonstration, not a recording of you. Squat only as low as feels comfortable; you do not need to match the example exactly.</p>
        <ReplayPlayer session={example} showMeasurements={false} />
      </details>
      <details>
        <summary>How these checks work and their sources</summary>
        <p>We look for your hips and knees bending together, your heels staying down, and a return to standing. When the camera cannot see you clearly, we say so instead of guessing.</p>
        <p>These cues are based on <a href="https://pmc.ncbi.nlm.nih.gov/articles/PMC4262933/" target="_blank" rel="noreferrer">published squat guidance</a>. Everyone moves a little differently; <a href="https://pmc.ncbi.nlm.nih.gov/articles/PMC10987311/" target="_blank" rel="noreferrer">research explains why squat positions vary</a>. These checks are a guide, not proof of perfect posture.</p>
        <p>Only completed repetitions are assessed. This feedback does not affect rep counting, calibration or saved measurements.</p>
      </details>
    </section>
  );
}
