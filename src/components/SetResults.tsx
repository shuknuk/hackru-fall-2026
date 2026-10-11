"use client";
import { useEffect, useState } from "react";
import type { Session } from "@/lib/motion/schema";
import { cloudSyncEnabled, getSession, saveSession } from "@/lib/motion/storage";
import { processSyncQueue } from "@/lib/cloud/sync";
import { useAccount } from "./AuthContext";
import { pendingResult } from "@/lib/motion/result-handoff";
import SquatPosture from "./SquatPosture";
import GeminiHelp from "./GeminiHelp";
import { coachContext } from "@/lib/coach-context";
import { summary } from "@/lib/motion/analysis";

export default function SetResults() {
  const { userId } = useAccount();
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
        const stored = await getSession(id, userId);
        if (!stored) throw new Error("This set was not found on this device.");
        if (active) { setSession(stored); setSaving(false); setSaved(true); setMessage("Saved on this device."); }
      }
    }
    void load().catch((error) => { if (active) setMessage(error.message); });
    return () => { active = false; };
  }, [userId]);
  if (!session) return <p role="status">{message} <a href="/history">Open history</a></p>;
  const stats = summary(session.reps);
  const duration = (session.samples.at(-1)?.t ?? 0) / 1000;
  return (
    <section className="panel">
      <h2>{stats.count} completed reps</h2>
      <ul className="result-summary">
        <li><strong>Status:</strong> {session.status === "complete" ? "Set complete" : "Set interrupted"}</li>
        <li><strong>Visible side:</strong> {session.capture.side}</li>
        <li><strong>Saved:</strong> {new Date(session.createdAt).toLocaleString()}</li>
      </ul>
      <p role="status">{message}</p>
      <dl className="metric-grid">
        <div><dt>Set duration</dt><dd>{duration.toFixed(1)} s</dd></div>
        <div><dt>Median estimated knee bend</dt><dd>{stats.peak === null ? "Unavailable" : `${stats.peak.toFixed(0)}°`}</dd></div>
        <div><dt>Median ascent time</dt><dd>{stats.ascent === null ? "Unavailable" : `${(stats.ascent / 1000).toFixed(1)} s`}</dd></div>
        <div><dt>Tracking coverage</dt><dd>{(session.summary.trackingCoverage * 100).toFixed(0)}%</dd></div>
      </dl>
      {session.summary.trackingCoverage < 0.75 ? <div className="result-alert" role="alert"><strong>We had trouble seeing your movement.</strong><ul><li>Move closer to the camera.</li><li>Keep your hips, knees, legs and feet fully visible.</li><li>Stay side-on, then record another set.</li></ul></div> : null}
      {!stats.count ? <p>No completed squats were recorded. Partial movements and unreliable tracking are excluded.</p> : null}
      <SquatPosture session={session} />
      <GeminiHelp key={session.id} sets={[coachContext(session)]} />
      <div className="actions">
        {saved ? <a className="button" href={`/replay?id=${session.id}`}>Replay set</a> : <button className="secondary-button" disabled={saving} onClick={() => {
          setSaving(true);
          setMessage("Saving on this device…");
          void (async () => {
            const queueCloudSync = userId ? await cloudSyncEnabled(userId).catch(() => false) : false;
            await saveSession(session, { ownerId: userId, queueCloudSync });
            if (queueCloudSync && userId) void processSyncQueue(userId);
          })().then(() => { setSaved(true); setMessage("Saved on this device."); }).catch((error) => setMessage(`Not saved: ${error.message}`)).finally(() => setSaving(false));
        }}>Retry saving</button>}
        {saved ? <a className="secondary-button" href={`/session?profile=${session.profile.id}`}>Record another set</a> : null}
        <a className="secondary-button" href="/results/saved">All saved results</a>
        <a className="secondary-button" href="/history">History and comparison</a>
      </div>
    </section>
  );
}
