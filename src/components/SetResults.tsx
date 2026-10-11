"use client";
import { useEffect, useState } from "react";
import type { Session } from "@/lib/motion/schema";
import { getSession, saveSession } from "@/lib/motion/storage";
import { pendingResult } from "@/lib/motion/result-handoff";
import SquatPosture from "./SquatPosture";
import { summary } from "@/lib/motion/analysis";

export default function SetResults() {
  const [session, setSession] = useState<Session | null>(null);
  const [message, setMessage] = useState("Loading your set…");
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(true);
  useEffect(() => {
    let active = true;
    async function load() {
      const id = new URLSearchParams(location.search).get("id");
      if (!id) throw new Error("Choose a saved set from history.");
      const pending = pendingResult(id);
      if (pending) {
        if (active) { setSession(pending.session); setMessage("Saving on this device…"); }
        const error = await pending.saving;
        if (active) { setSaving(false); setSaved(error === null); setMessage(error ? `Not saved: ${error}. Keep this page open and retry saving.` : "Saved on this device."); }
      } else {
        const stored = await getSession(id);
        if (!stored) throw new Error("This set was not found on this device.");
        if (active) { setSession(stored); setSaving(false); setSaved(true); setMessage("Saved on this device."); }
      }
    }
    void load().catch((error) => { if (active) setMessage(error.message); });
    return () => { active = false; };
  }, []);
  if (!session) return <p role="status">{message} <a href="/history">Open history</a></p>;
  const stats = summary(session.reps);
  const duration = (session.samples.at(-1)?.t ?? 0) / 1000;
  return (
    <section className="panel">
      <h2>{stats.count} completed reps</h2>
      <p>{session.status === "complete" ? "Set complete" : "Set interrupted"} · Anatomical {session.capture.side}</p>
      <p role="status">{message}</p>
      <dl className="metric-grid">
        <div><dt>Set duration</dt><dd>{duration.toFixed(1)} s</dd></div>
        <div><dt>Median estimated knee bend</dt><dd>{stats.peak === null ? "Unavailable" : `${stats.peak.toFixed(0)}°`}</dd></div>
        <div><dt>Median ascent time</dt><dd>{stats.ascent === null ? "Unavailable" : `${(stats.ascent / 1000).toFixed(1)} s`}</dd></div>
        <div><dt>Tracking coverage</dt><dd>{(session.summary.trackingCoverage * 100).toFixed(0)}%</dd></div>
      </dl>
      {!stats.count ? <p>No completed squats were recorded. Partial movements and unreliable tracking are excluded.</p> : null}
      <SquatPosture session={session} />
      <div className="actions">
        {saved ? <a className="button" href={`/replay?id=${session.id}`}>Replay set</a> : <button className="secondary-button" disabled={saving} onClick={() => {
          setSaving(true);
          setMessage("Saving on this device…");
          void saveSession(session).then(() => { setSaved(true); setMessage("Saved on this device."); }).catch((error) => setMessage(`Not saved: ${error.message}`)).finally(() => setSaving(false));
        }}>Retry saving</button>}
        {saved ? <a className="secondary-button" href={`/session?profile=${session.profile.id}`}>Record another set</a> : null}
        <a className="secondary-button" href="/history">History and comparison</a>
      </div>
    </section>
  );
}
