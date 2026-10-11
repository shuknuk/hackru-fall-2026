"use client";

import { workoutSummary } from "./workout-summary";
import {
  completeSyncJob,
  getSession,
  listSyncJobs,
  type SyncJob,
} from "@/lib/motion/storage";

async function responseError(response: Response) {
  const body = await response.json().catch(() => null) as { error?: string } | null;
  return body?.error ?? `Cloud request failed (${response.status}).`;
}
export async function uploadSessionSummary(sessionId: string, ownerId: string) {
  const session = await getSession(sessionId, ownerId);
  if (!session) throw new Error("The local workout is unavailable to this account.");
  const response = await fetch("/api/workouts", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(workoutSummary(session)),
  });
  if (!response.ok) throw new Error(await responseError(response));
}
async function runJob(job: SyncJob) {
  if (job.action === "upload") await uploadSessionSummary(job.sessionId, job.ownerId);
  else {
    const response = await fetch(`/api/workouts/${encodeURIComponent(job.sessionId)}`, { method: "DELETE" });
    if (!response.ok) throw new Error(await responseError(response));
  }
}
export async function processSyncQueue(ownerId: string) {
  const jobs = await listSyncJobs(ownerId);
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
