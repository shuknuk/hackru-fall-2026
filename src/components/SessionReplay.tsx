"use client";
import { useEffect, useState } from "react";
import type { Session } from "@/lib/motion/schema";
import { getSession, download } from "@/lib/motion/storage";
import { summary } from "@/lib/motion/analysis";
import ReplayPlayer from "./ReplayPlayer";
export default function SessionReplay() {
  const [session, setSession] = useState<Session | null>(null);
  const [message, setMessage] = useState("Loading stored landmarks…");
  useEffect(() => {
    async function load() {
      const id = new URLSearchParams(location.search).get("id");
      if (!id) throw new Error("Choose a session from history.");
      const s = await getSession(id);
      if (!s) throw new Error("This session was not found on this device.");
      return s;
    }
    void load()
      .then(setSession)
      .catch((e) => setMessage(e.message));
  }, []);
  if (!session)
    return (
      <p role="status">
        {message} <a href="/history">Open history</a>
      </p>
    );
  const s = summary(session.reps);
  return (
    <>
      <section className="panel">
        <p className="eyebrow">
          {session.importedFrom
            ? `IMPORTED · DECLARED SOURCE ${session.source}`
            : session.source === "live"
              ? "PERSONAL CAPTURE"
              : session.source === "sample-synthetic"
                ? "SYNTHETIC SAMPLE · AUTHORED JOINTS"
                : "RECORDED SAMPLE"}
        </p>
        <h2>{s.count} completed reps</h2>
        <p>
          {session.status} · {new Date(session.createdAt).toLocaleString()} ·
          anatomical {session.capture.side}
        </p>
        {!s.count ? (
          <p>
            No complete cycles passed the tracking and return-to-standing
            checks. You can inspect the partial movement below.
          </p>
        ) : (
          <p>
            Median estimated knee bend {s.peak?.toFixed(0)}° · Between-rep
            variation {s.variation?.toFixed(1)}° MAD · Median valid coverage{" "}
            {((s.coverage ?? 0) * 100).toFixed(0)}%
          </p>
        )}
        <p>
          Tracking available during{" "}
          {(session.summary.trackingCoverage * 100).toFixed(0)}% of recorded
          time. Missing intervals do not contribute to repetitions.
        </p>
        <div className="actions">
          <button
            className="secondary-button"
            onClick={() => download(session)}
          >
            Export session
          </button>
          {session.source === "live" ? (
            <a
              className="secondary-button"
              href={`/session?profile=${session.profile.id}`}
            >
              Record another set
            </a>
          ) : null}
          <a className="secondary-button" href="/history">
            Choose sets to compare
          </a>
        </div>
      </section>
      <ReplayPlayer session={session} />
    </>
  );
}
