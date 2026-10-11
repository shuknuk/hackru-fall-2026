"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { workoutSummarySchema, type WorkoutSummary } from "@/lib/cloud/workout-summary";
import { processSyncQueue, withTigerSyncLock } from "@/lib/cloud/sync";
import { startTigerTrends, stopTigerTrends, tigerDeviceToken, tigerTrendsEnabled } from "@/lib/motion/storage";
import MeasurementTrend from "./MeasurementTrend";

type Day = { day: string; sessionCount: number; totalReps: number };
async function headers() {
  const token = await tigerDeviceToken();
  if (!token) throw new Error("Tiger Data trends are not enabled on this phone.");
  return { authorization: `Bearer ${token}` };
}
export default function Dashboard() {
  const [workouts, setWorkouts] = useState<WorkoutSummary[]>([]);
  const [days, setDays] = useState<Day[]>([]);
  const [enabled, setEnabled] = useState(false);
  const [message, setMessage] = useState("Checking this phone…");
  const [busy, setBusy] = useState(false);
  const refresh = useCallback(async () => {
    const active = await tigerTrendsEnabled();
    setEnabled(active);
    if (!active) { setMessage("Detailed recordings stay on this phone until you choose to view measurements over time."); return; }
    const jobs = await processSyncQueue();
    const auth = await headers();
    const [workoutsResponse, analyticsResponse] = await Promise.all([
      fetch("/api/workouts?limit=50", { cache: "no-store", headers: auth }),
      fetch("/api/analytics/daily?days=30", { cache: "no-store", headers: auth }),
    ]);
    if (!workoutsResponse.ok || !analyticsResponse.ok) throw new Error("Tiger Data is temporarily unavailable. Local recordings are safe on this phone.");
    const workoutBody = await workoutsResponse.json() as { workouts: unknown[] };
    const analyticsBody = await analyticsResponse.json() as { days: Day[] };
    setWorkouts(workoutBody.workouts.map((value) => workoutSummarySchema.parse(value)));
    setDays(analyticsBody.days);
    setMessage(jobs.some((job) => job.error) ? "Some measurements are waiting to upload. Your recordings are saved on this phone." : "Tiger Data summaries are up to date. Daily buckets use UTC.");
  }, []);
  useEffect(() => {
    const refreshOnOpen = () => void refresh().catch((error) => setMessage(error instanceof Error ? error.message : "Tiger Data is unavailable."));
    const timer = setTimeout(refreshOnOpen, 0);
    window.addEventListener("online", refreshOnOpen);
    return () => { clearTimeout(timer); window.removeEventListener("online", refreshOnOpen); };
  }, [refresh]);
  const totals = useMemo(() => ({ workouts: workouts.length, reps: workouts.reduce((sum, workout) => sum + workout.repCount, 0) }), [workouts]);
  async function act(work: () => Promise<void>) {
    setBusy(true);
    try { await work(); await refresh(); }
    catch (error) { setMessage(error instanceof Error ? error.message : "Tiger Data action failed. Local recordings are unchanged."); }
    finally { setBusy(false); }
  }
  if (!enabled) return <section className="panel">
    <h2>Measurements over time</h2>
    <p role="status">{message}</p>
    <p>Tiger Data stores only dated measurement summaries from this phone: repetitions, estimated knee bend, ascent time and tracking coverage. Camera images, video, landmarks and replays stay here.</p>
    <p>No account or device fingerprint is used. History is linked to this browser on this site. Clearing site data loses its private access key; delete Tiger Data history first if you want it removed.</p>
    <button className="button" disabled={busy} onClick={() => void act(async () => { await startTigerTrends(); await processSyncQueue(); })}>View measurements over time with Tiger Data</button>
  </section>;
  return <>
    <p role="status">{message}</p>
    <button className="secondary-button" disabled={busy} onClick={() => void act(async () => {})}>Refresh measurements</button>
    <p>Showing the latest 50 sets. Compare similar camera placement and the same visible side. Changes in estimated knee bend or timing do not automatically mean improvement.</p>
    <MeasurementTrend workouts={workouts} metric="medianKneeBend" label="Estimated knee bend" unit="°" />
    <MeasurementTrend workouts={workouts} metric="medianAscentMs" label="Estimated ascent time" unit="s" />
    <MeasurementTrend workouts={workouts} metric="trackingCoverage" label="Tracking coverage" unit="%" />
    <section className="dashboard-summary" aria-label="Tiger Data progress summary">
      <div><strong>{totals.workouts}</strong><span>Saved measurements</span></div>
      <div><strong>{totals.reps}</strong><span>Total squats</span></div>
      <div><strong>{days.reduce((sum, day) => sum + day.sessionCount, 0)}</strong><span>Last 30 days</span></div>
    </section>
    <section className="panel" aria-labelledby="progress-chart-title">
      <h2 id="progress-chart-title">Workouts over time</h2>
      {days.length ? <div className="progress-chart" role="img" aria-label={days.map((day) => `${new Date(day.day).toLocaleDateString()}: ${day.sessionCount} workouts`).join(", ")}>{days.map((day) => <div key={day.day} style={{ height: `${Math.max(12, day.sessionCount * 24)}px` }} title={`${new Date(day.day).toLocaleDateString()}: ${day.sessionCount} workouts`} />)}</div> : <p>No summaries have reached Tiger Data yet.</p>}
    </section>
    <section aria-labelledby="cloud-history-title">
      <h2 id="cloud-history-title">Measurement history from this phone</h2>
      {workouts.map((workout) => <article className="panel" key={workout.sessionId}>
        <h3>{workout.repCount} completed reps</h3>
        <p>{new Date(workout.recordedAt).toLocaleString()} · estimated knee bend {workout.medianKneeBend?.toFixed(0) ?? "unavailable"}° · ascent {workout.medianAscentMs === null ? "unavailable" : `${(workout.medianAscentMs / 1000).toFixed(1)} s`}</p>
      </article>)}
    </section>
    <section className="panel">
      <h2>Privacy control</h2>
      <p>Delete this phone’s Tiger Data summaries and stop future uploads. Local recordings remain on this phone.</p>
      <button className="secondary-button" disabled={busy} onClick={() => void act(async () => {
        if (!confirm("Delete this phone’s Tiger Data measurement history? Local recordings will remain on this phone.")) return;
        await withTigerSyncLock(async () => {
          const response = await fetch("/api/workouts", { method: "DELETE", headers: await headers() });
          if (!response.ok) throw new Error("Tiger Data deletion did not complete. Nothing was removed locally.");
          await stopTigerTrends();
        });
      })}>Delete Tiger Data history</button>
    </section>
    <p className="status"><a href="https://www.tigerdata.com/" rel="noreferrer">Powered by Tiger Data</a></p>
  </>;
}
