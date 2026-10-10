"use client";

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
  const [consented, setConsented] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<CoachResponse | null>(null);
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
    setError("");
    setResult(null);
    try {
      const response = await fetch("/api/coach", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      const value = await response.json();
      if (!response.ok)
        throw new Error(
          typeof value?.error === "string" ? value.error : "Coach unavailable.",
        );
      setResult(coachResponseSchema.parse(value));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Coach unavailable.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="coach" aria-labelledby="coach-title">
      <p className="eyebrow">OPTIONAL · GEMINI</p>
      <h3 id="coach-title">Plain-language measurement coach</h3>
      <p>
        If you opt in, Menhel sends only the aggregate values and measurement
        statements shown above to Google Gemini. Camera frames, landmarks,
        session identifiers, and saved sets are not sent.
      </p>
      <label className="check">
        <input
          type="checkbox"
          checked={consented}
          onChange={(event) => setConsented(event.target.checked)}
        />
        Send this measurement summary for a one-time explanation.
      </label>
      <button
        className="secondary-button"
        disabled={!consented || loading}
        onClick={() => void requestCoach()}
      >
        {loading ? "Explaining measurements…" : "Ask Gemini to explain"}
      </button>
      <div aria-live="polite">
        {error ? <p>{error}</p> : null}
        {result ? (
          <div className="coach-result">
            <h4>{result.headline}</h4>
            <ul>
              {result.explanations.map((item) => (
                <li key={item.metricId}>
                  {item.text} <small>Evidence: {item.metricId}</small>
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
