"use client";

import GeminiButton from "./GeminiButton";
import { useState } from "react";
import type { Session } from "@/lib/motion/schema";
import { summary } from "@/lib/motion/analysis";
import type { observations } from "@/lib/motion/compare";
import {
  coachResponseSchema,
  type CoachRequest,
  type CoachResponse,
} from "@/lib/coach";

type Evidence = ReturnType<typeof observations>;

export default function GeminiCoach({
  setA,
  setB,
  evidence,
}: {
  setA: Session;
  setB: Session;
  evidence: Evidence;
}) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<CoachResponse | null>(null);
  const [diagnostics, setDiagnostics] = useState<unknown>(null);
  const [error, setError] = useState("");

  async function requestCoach() {
    const a = summary(setA.reps),
      b = summary(setB.reps);
    const body: CoachRequest = {
      setA: {
        completedReps: a.count,
        trackingCoverage: setA.summary.trackingCoverage,
        medianKneeFlexion: a.peak,
        medianAscentMs: a.ascent,
      },
      setB: {
        completedReps: b.count,
        trackingCoverage: setB.summary.trackingCoverage,
        medianKneeFlexion: b.peak,
        medianAscentMs: b.ascent,
      },
      evidence: evidence.map((item) => ({
        metricId: item.metric as CoachRequest["evidence"][number]["metricId"],
        deterministicText: item.text,
      })),
    };
    setLoading(true);
    setError(""); setDiagnostics(null);
    setResult(null);
    try {
      const response = await fetch("/api/coach", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      const value = await response.json();
      if (!response.ok) setDiagnostics(value.diagnostics ?? { httpStatus: response.status });
      if (!response.ok)
        throw new Error(
          typeof value?.error === "string" ? value.error : "Gemini could not respond. Please try again.",
        );
      setResult(coachResponseSchema.parse(value));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Gemini could not respond. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="coach" aria-labelledby="coach-title">
      <p className="eyebrow">GEMINI</p>
      <h3 id="coach-title">Measurement coach</h3>
      <p>
        Compare these squat sets with Gemini. Only the measurement summary shown above
        is sent to Google Gemini. Your video and body landmarks stay on this device.
      </p>
      <p>Pressing Analyze with Gemini sends these summaries to Google for this comparison.</p>
      <GeminiButton busy={loading} onClick={() => void requestCoach()} />
      <div aria-live="polite">
        {error ? <p role="alert">{error}</p> : null}{diagnostics ? <details open><summary>Gemini error details</summary><pre className="gemini-diagnostics">{JSON.stringify(diagnostics, null, 2)}</pre></details> : null}
        {result ? (
          <div className="coach-result">
            <h4>{result.headline}</h4>
            <ul>
              {result.explanations.map((item) => (
                <li key={item.metricId}>
                  {item.text}
                </li>
              ))}
            </ul>
            <p>{result.caveat}</p>
          </div>
        ) : null}
      </div>
    </section>
  );
}
