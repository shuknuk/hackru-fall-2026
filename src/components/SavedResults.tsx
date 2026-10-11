"use client";

import { useEffect, useState } from "react";
import { summary } from "@/lib/motion/analysis";
import type { Session } from "@/lib/motion/schema";
import { listSessions } from "@/lib/motion/storage";

export default function SavedResults() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [message, setMessage] = useState("Loading saved results…");

  useEffect(() => {
    let active = true;
    void listSessions().then((records) => {
      if (!active) return;
      setSessions(records);
      setMessage(records.length ? `${records.length} saved ${records.length === 1 ? "set" : "sets"}.` : "No saved results yet.");
    }).catch((error: unknown) => {
      if (active) setMessage(`Could not load saved results: ${error instanceof Error ? error.message : "Local storage error"}`);
    });
    return () => { active = false; };
  }, []);

  return <>
    <p role="status">{message}</p>
    {!sessions.length ? <div className="actions"><a className="button" href="/session">Record your first set</a></div> : null}
    <div className="saved-results">
      {sessions.map((session) => {
        const stats = summary(session.reps);
        const duration = (session.samples.at(-1)?.t ?? 0) / 1000;
        return <article className="saved-result" key={session.id}>
          <header>
            <div><p className="eyebrow">{session.source === "live" ? "YOUR RECORDING" : "SQUAT SAMPLE"}</p><h2>{stats.count} completed reps</h2></div>
            <time dateTime={session.createdAt}>{new Date(session.createdAt).toLocaleString()}</time>
          </header>
          <dl className="saved-result__metrics">
            <div><dt>Duration</dt><dd>{duration.toFixed(1)} s</dd></div>
            <div><dt>Tracking</dt><dd>{(session.summary.trackingCoverage * 100).toFixed(0)}%</dd></div>
            <div><dt>Visible side</dt><dd>{session.capture.side}</dd></div>
            <div><dt>Status</dt><dd>{session.status}</dd></div>
          </dl>
          <div className="actions"><a className="button" href={`/results?id=${session.id}`}>View full results</a><a className="secondary-button" href={`/replay?id=${session.id}`}>Replay</a></div>
        </article>;
      })}
    </div>
  </>;
}
