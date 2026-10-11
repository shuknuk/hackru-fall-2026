"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import AccountPrompt from "./AccountPrompt";
import { useAccount } from "./AuthContext";
import { workoutSummary, workoutSummarySchema, type WorkoutSummary } from "@/lib/cloud/workout-summary";
import { processSyncQueue } from "@/lib/cloud/sync";
import {
  claimGuestSession,
  cloudSyncEnabled,
  getSessionMeta,
  listSessions,
  queueCloudDelete,
  setCloudSyncEnabled,
} from "@/lib/motion/storage";
import type { Session } from "@/lib/motion/schema";

type Day = { day: string; sessionCount: number; totalReps: number; averageTrackingCoverage: number; averageDurationMs: number };
export default function Dashboard() {
  const { loaded, userId } = useAccount();
  const [workouts, setWorkouts] = useState<WorkoutSummary[]>([]);
  const [days, setDays] = useState<Day[]>([]);
  const [sevenDayWorkouts, setSevenDayWorkouts] = useState(0);
  const [eligible, setEligible] = useState<Session[]>([]);
  const [syncEnabled, setSyncEnabled] = useState(false);
  const [message, setMessage] = useState("Loading your progress…");
  const [busy, setBusy] = useState(false);
  const refresh = useCallback(async () => {
    if (!userId) return;
    const [workoutsResponse, analyticsResponse, sevenDayResponse, local, enabled] = await Promise.all([
      fetch("/api/workouts?limit=50", { cache: "no-store" }),
      fetch("/api/analytics/daily?days=30", { cache: "no-store" }),
      fetch("/api/analytics/daily?days=7", { cache: "no-store" }),
      listSessions(userId),
      cloudSyncEnabled(userId),
    ]);
    setSyncEnabled(enabled);
    const guests = await Promise.all(local.filter((session) => session.source === "live" && !session.importedFrom && ["complete", "interrupted"].includes(session.status)).map(async (session) => ({ session, meta: await getSessionMeta(session.id) })));
    setEligible(guests.filter(({ meta }) => !meta?.ownerId).map(({ session }) => session));
    if (!workoutsResponse.ok || !analyticsResponse.ok || !sevenDayResponse.ok) {
      setMessage("Cloud progress is unavailable right now. Local workouts and recording still work.");
      return;
    }
    const workoutBody = await workoutsResponse.json() as { workouts: unknown[] };
    setWorkouts(workoutBody.workouts.map((value) => workoutSummarySchema.parse(value)));
    const analyticsBody = await analyticsResponse.json() as { days: Day[] };
    setDays(analyticsBody.days);
    const sevenDayBody = await sevenDayResponse.json() as { days: Day[] };
    setSevenDayWorkouts(sevenDayBody.days.reduce((sum, day) => sum + day.sessionCount, 0));
    setMessage("Cloud summaries are up to date. Daily buckets use UTC.");
  }, [userId]);
  useEffect(() => {
    if (!userId) return;
    const timer = setTimeout(() => void refresh().catch(() => setMessage("Cloud progress is unavailable right now. Local workouts and recording still work.")), 0);
    return () => clearTimeout(timer);
  }, [refresh, userId]);
  const totals = useMemo(() => ({ workouts: workouts.length, reps: workouts.reduce((sum, workout) => sum + workout.repCount, 0) }), [workouts]);
  async function act(work: () => Promise<void>) {
    setBusy(true);
    try { await work(); await refresh(); }
    catch (error) { setMessage(error instanceof Error ? error.message : "Cloud action failed. Local data is unchanged."); }
    finally { setBusy(false); }
  }
  if (!loaded) return <p role="status">Checking your account…</p>;
  if (!userId) return <AccountPrompt />;
  return <>
    <p role="status">{message}</p>
    <section className="dashboard-summary" aria-label="Cloud progress summary">
      <div><strong>{totals.workouts}</strong><span>Total workouts</span></div>
      <div><strong>{totals.reps}</strong><span>Total squats</span></div>
      <div><strong>{sevenDayWorkouts}</strong><span>Last 7 days</span></div>
      <div><strong>{days.reduce((sum, day) => sum + day.sessionCount, 0)}</strong><span>Last 30 days</span></div>
    </section>
    <section className="panel">
      <h2>Workout summary sync</h2>
      <label className="check"><input type="checkbox" checked={syncEnabled} disabled={busy} onChange={(event) => void act(async () => {
        await setCloudSyncEnabled(userId, event.target.checked);
        if (event.target.checked) await processSyncQueue(userId);
      })} />Save future workout summaries to my account</label>
      <p>Full pose landmarks, replay data, camera images and video stay on this device. Cloud trouble never blocks local recording.</p>
      {eligible.length ? <><p>{eligible.length} eligible guest {eligible.length === 1 ? "workout" : "workouts"} remain local.</p><button className="secondary-button" disabled={busy} onClick={() => void act(async () => {
        for (const session of eligible) {
          const response = await fetch("/api/workouts", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(workoutSummary(session)) });
          if (!response.ok) throw new Error("Guest import stopped. Workouts not yet imported remain local.");
          await claimGuestSession(session.id, userId);
        }
      })}>Import eligible guest summaries</button></> : <p>No unclaimed guest workout summaries on this device.</p>}
    </section>
    <section className="panel" aria-labelledby="progress-chart-title">
      <h2 id="progress-chart-title">Daily workouts · last 30 days</h2>
      {days.length ? <div className="progress-chart" role="img" aria-label={days.map((day) => `${new Date(day.day).toLocaleDateString()}: ${day.sessionCount} workouts`).join(", ")}>
        {days.map((day) => <div key={day.day} style={{ height: `${Math.max(12, day.sessionCount * 24)}px` }} title={`${new Date(day.day).toLocaleDateString()}: ${day.sessionCount} workouts`} />)}
      </div> : <p>No cloud workouts yet.</p>}
    </section>
    <section aria-labelledby="cloud-history-title">
      <h2 id="cloud-history-title">Cloud history</h2>
      {workouts.map((workout) => <article className="panel" key={workout.sessionId}>
        <p className="eyebrow">SAVED TO YOUR ACCOUNT · SUMMARY ONLY</p>
        <h3>{workout.repCount} completed reps</h3>
        <p>{new Date(workout.recordedAt).toLocaleString()} · {(workout.trackingCoverage * 100).toFixed(0)}% tracking</p>
        <button className="secondary-button" disabled={busy} onClick={() => void act(async () => {
          const job = await queueCloudDelete(userId, workout.sessionId);
          const [result] = await processSyncQueue(userId);
          if (!result || result.job.id !== job.id || result.error) throw new Error("Cloud deletion is waiting to retry. The summary may still appear until the service reconnects.");
        })}>Delete cloud summary</button>
      </article>)}
    </section>
    <p className="status"><a href="https://www.tigerdata.com/" rel="noreferrer">Powered by Tiger Data</a></p>
  </>;
}
