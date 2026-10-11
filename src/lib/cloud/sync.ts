"use client";

import { workoutSummary } from "./workout-summary";
import {
  completeSyncJob,
  getSession,
  listSyncJobs,
  tigerDeviceToken,
  type SyncJob,
} from "@/lib/motion/storage";

async function responseError(response: Response) {
  const body = await response.json().catch(() => null) as { error?: string } | null;
  return body?.error ?? `Cloud request failed (${response.status}).`;
}
async function headers() {
  const token = await tigerDeviceToken();
  if (!token) throw new Error("Tiger Data trends are not enabled on this phone.");
  return { authorization: `Bearer ${token}`, "content-type": "application/json" };
}
export async function uploadSessionSummary(sessionId: string) {
  const session = await getSession(sessionId);
  if (!session) throw new Error("The local workout is unavailable on this phone.");
  const response = await fetch("/api/workouts", {
    method: "POST",
    headers: await headers(),
    body: JSON.stringify(workoutSummary(session)),
  });
  if (!response.ok) throw new Error(await responseError(response));
}
async function runJob(job: SyncJob) {
  if (job.action === "upload") await uploadSessionSummary(job.sessionId);
  else {
    const response = await fetch(`/api/workouts/${encodeURIComponent(job.sessionId)}`, { method: "DELETE", headers: await headers() });
    if (!response.ok && response.status !== 404) throw new Error(await responseError(response));
  }
}
let pending: Promise<unknown> = Promise.resolve();
export async function withTigerSyncLock<T>(work: () => Promise<T>): Promise<T> {
  if (typeof navigator !== "undefined" && navigator.locks) return await navigator.locks.request("menhel-tiger-sync", work);
  const next = pending.then(work, work);
  pending = next.catch(() => undefined);
  return next;
}
export function processSyncQueue() {
  return withTigerSyncLock(runSyncQueue);
}
async function runSyncQueue() {
  const jobs = await listSyncJobs();
  const results = [] as { job: SyncJob; error: string | null }[];
  for (const job of jobs) {
    try {
      await runJob(job);
      await completeSyncJob(job, "synced");
      results.push({ job, error: null });
    } catch (error) {
      await completeSyncJob(job, "failed");
      results.push({ job, error: error instanceof Error ? error.message : "Cloud synchronization failed." });
    }
  }
  return results;
}
