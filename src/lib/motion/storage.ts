import { openDB, type DBSchema } from "idb";
import type { Capture, Profile, Sample, Session } from "./schema";
import { parseSession, buildSession } from "./session";

export const GUEST_WORKOUT_LIMIT = 5;
const RESERVATION_MS = 5 * 60 * 1000;

interface Draft {
  id: string;
  createdAt: string;
  profile: Profile;
  capture: Capture;
  samples: Sample[];
}
export type SyncState = "local" | "pending" | "synced" | "failed" | "delete-pending";
export interface SessionMeta {
  sessionId: string;
  ownerId: string | null;
  syncState: SyncState;
  updatedAt: string;
}
export interface SyncJob {
  id: string;
  ownerId: string;
  sessionId: string;
  action: "upload" | "delete";
  createdAt: string;
}
interface GuestUsage { sessionId: string; countedAt: string }
interface GuestReservation { sessionId: string; expiresAt: number }
interface MotionDB extends DBSchema {
  sessions: { key: string; value: Session; indexes: { createdAt: string } };
  profiles: { key: string; value: Profile };
  drafts: { key: string; value: Draft };
  settings: { key: string; value: string };
  sessionMeta: { key: string; value: SessionMeta };
  guestUsage: { key: string; value: GuestUsage };
  guestReservations: { key: string; value: GuestReservation };
  syncQueue: { key: string; value: SyncJob };
}
async function database() {
  let expired = false;
  const opening = openDB<MotionDB>("menhel-motion", 2, {
    upgrade(db, oldVersion, _newVersion, transaction) {
      if (oldVersion < 1) {
        const sessions = db.createObjectStore("sessions", { keyPath: "id" });
        sessions.createIndex("createdAt", "createdAt");
        db.createObjectStore("profiles", { keyPath: "id" });
        db.createObjectStore("drafts", { keyPath: "id" });
        db.createObjectStore("settings");
      }
      if (oldVersion < 2) {
        db.createObjectStore("sessionMeta", { keyPath: "sessionId" });
        const usage = db.createObjectStore("guestUsage", { keyPath: "sessionId" });
        db.createObjectStore("guestReservations", { keyPath: "sessionId" });
        db.createObjectStore("syncQueue", { keyPath: "id" });
        const cursor = transaction.objectStore("sessions").openCursor();
        void cursor.then(async function migrate(record): Promise<void> {
          if (!record) return;
          const session = record.value as Session;
          if (session.source === "live" && !session.importedFrom)
            await usage.put({ sessionId: session.id, countedAt: session.createdAt });
          return migrate(await record.continue());
        });
      }
    },
    blocking() { void opening.then((db) => db.close()); },
  });
  let timer: ReturnType<typeof setTimeout>;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      expired = true;
      reject(new Error("Local storage is blocked or unavailable. Close other app tabs and retry."));
    }, 5000);
  });
  opening.then((db) => { if (expired) db.close(); }, () => {});
  try { return await Promise.race([opening, timeout]); }
  finally { clearTimeout(timer!); }
}
function announceChange() {
  if (typeof BroadcastChannel === "undefined") return;
  const channel = new BroadcastChannel("menhel-motion");
  channel.postMessage("storage-changed");
  channel.close();
}
function isCountedGuestWorkout(session: Session) {
  return session.source === "live" && !session.importedFrom;
}
export async function reserveGuestWorkout(sessionId: string) {
  const db = await database();
  try {
    const tx = db.transaction(["guestUsage", "guestReservations"], "readwrite");
    const reservations = tx.objectStore("guestReservations");
    const now = Date.now();
    for (const reservation of await reservations.getAll())
      if (reservation.expiresAt <= now) await reservations.delete(reservation.sessionId);
    const used = await tx.objectStore("guestUsage").count();
    if (used >= GUEST_WORKOUT_LIMIT) {
      tx.abort();
      await tx.done.catch(() => {});
      return { allowed: false as const, reason: "limit" as const, used };
    }
    if (used + (await reservations.count()) >= GUEST_WORKOUT_LIMIT) {
      tx.abort();
      await tx.done.catch(() => {});
      return { allowed: false as const, reason: "busy" as const, used };
    }
    await reservations.put({ sessionId, expiresAt: now + RESERVATION_MS });
    await tx.done;
    return { allowed: true as const, used };
  } finally { db.close(); }
}
export async function releaseGuestReservation(sessionId: string) {
  const db = await database();
  try { await db.delete("guestReservations", sessionId); } finally { db.close(); }
}
export async function getGuestUsage() {
  const db = await database();
  try { return await db.count("guestUsage"); } finally { db.close(); }
}
export async function saveSession(
  session: Session,
  context: { ownerId?: string | null; queueCloudSync?: boolean } = {},
) {
  const checked = parseSession(JSON.stringify(session));
  const db = await database();
  try {
    const tx = db.transaction(
      ["sessions", "profiles", "drafts", "sessionMeta", "guestUsage", "guestReservations", "syncQueue"],
      "readwrite",
    );
    const store = tx.objectStore("sessions");
    const exists = await store.get(checked.id);
    if (!exists && (await store.count()) >= 20) {
      tx.abort();
      await tx.done.catch(() => {});
      throw new Error("Twenty sessions are already saved. Delete a session before saving another.");
    }
    if (!exists && !context.ownerId && isCountedGuestWorkout(checked)) {
      const usage = tx.objectStore("guestUsage");
      if (!(await usage.get(checked.id))) {
        if ((await usage.count()) >= GUEST_WORKOUT_LIMIT) {
          tx.abort();
          await tx.done.catch(() => {});
          throw new Error("Five free workouts have been used. Create a free account or sign in to keep recording.");
        }
        await usage.put({ sessionId: checked.id, countedAt: new Date().toISOString() });
      }
    }
    await store.put(checked);
    await tx.objectStore("profiles").put(checked.profile);
    await tx.objectStore("drafts").delete(checked.id);
    await tx.objectStore("guestReservations").delete(checked.id);
    const prior = await tx.objectStore("sessionMeta").get(checked.id);
    const ownerId = context.ownerId === undefined ? prior?.ownerId ?? null : context.ownerId;
    const syncState: SyncState = context.queueCloudSync && ownerId ? "pending" : prior?.syncState ?? "local";
    await tx.objectStore("sessionMeta").put({ sessionId: checked.id, ownerId, syncState, updatedAt: new Date().toISOString() });
    if (context.queueCloudSync && ownerId) {
      const job: SyncJob = { id: `${ownerId}:${checked.id}:upload`, ownerId, sessionId: checked.id, action: "upload", createdAt: new Date().toISOString() };
      await tx.objectStore("syncQueue").put(job);
    }
    await tx.done;
    announceChange();
  } finally { db.close(); }
}
export async function getSession(id: string, ownerId: string | null = null) {
  const db = await database();
  try {
    const [session, meta] = await Promise.all([db.get("sessions", id), db.get("sessionMeta", id)]);
    if (meta?.ownerId && meta.ownerId !== ownerId) return null;
    return session ? parseSession(JSON.stringify(session)) : null;
  } finally { db.close(); }
}
export async function listSessions(ownerId: string | null = null) {
  const db = await database();
  try {
    const [records, metadata] = await Promise.all([db.getAllFromIndex("sessions", "createdAt"), db.getAll("sessionMeta")]);
    const owners = new Map(metadata.map((meta) => [meta.sessionId, meta.ownerId]));
    return records.reverse().filter((session) => !owners.get(session.id) || owners.get(session.id) === ownerId).map((session) => parseSession(JSON.stringify(session)));
  } finally { db.close(); }
}
export async function getSessionMeta(sessionId: string) {
  const db = await database();
  try { return await db.get("sessionMeta", sessionId); } finally { db.close(); }
}
export async function getProfile(id: string) {
  const db = await database();
  try { return await db.get("profiles", id); } finally { db.close(); }
}
export async function checkpoint(draft: Draft) {
  const db = await database();
  try {
    const tx = db.transaction("drafts", "readwrite");
    if (!(await tx.store.get(draft.id)) && (await tx.store.count()) >= 20) {
      tx.abort();
      await tx.done.catch(() => {});
      throw new Error("Draft storage is full. Recover or delete older drafts.");
    }
    await tx.store.put(draft);
    await tx.done;
  } finally { db.close(); }
}
export async function listDrafts() {
  const db = await database();
  try { return await db.getAll("drafts"); } finally { db.close(); }
}
export async function recoverDraft(id: string, ownerId: string | null = null, queueCloudSync = false) {
  const db = await database();
  let draft;
  try { draft = await db.get("drafts", id); } finally { db.close(); }
  if (!draft) throw new Error("Draft no longer exists");
  const session = buildSession(draft.samples, draft.profile, draft.capture, "interrupted", "live", draft.id);
  session.createdAt = draft.createdAt;
  await saveSession(session, { ownerId, queueCloudSync });
  return session;
}
export async function deleteDraft(id: string) {
  const db = await database();
  try { await db.delete("drafts", id); } finally { db.close(); }
}
export async function deleteSession(id: string, ownerId: string | null = null) {
  const db = await database();
  try {
    const tx = db.transaction(["sessions", "profiles", "drafts", "sessionMeta", "syncQueue"], "readwrite");
    const meta = await tx.objectStore("sessionMeta").get(id);
    if (meta?.ownerId && meta.ownerId !== ownerId) throw new Error("This session belongs to another account on this device.");
    const session = await tx.objectStore("sessions").get(id);
    await tx.objectStore("sessions").delete(id);
    await tx.objectStore("sessionMeta").delete(id);
    if (meta?.ownerId) await tx.objectStore("syncQueue").delete(`${meta.ownerId}:${id}:upload`);
    if (session) {
      const sessions = await tx.objectStore("sessions").getAll();
      const drafts = await tx.objectStore("drafts").getAll();
      if (!sessions.some((item) => item.profile.id === session.profile.id) && !drafts.some((item) => item.profile.id === session.profile.id))
        await tx.objectStore("profiles").delete(session.profile.id);
    }
    await tx.done;
    announceChange();
  } finally { db.close(); }
}
export async function cloudSyncEnabled(ownerId: string) {
  const db = await database();
  try { return (await db.get("settings", `cloud-sync:${ownerId}`)) === "enabled"; } finally { db.close(); }
}
export async function setCloudSyncEnabled(ownerId: string, enabled: boolean) {
  const db = await database();
  try { await db.put("settings", enabled ? "enabled" : "disabled", `cloud-sync:${ownerId}`); } finally { db.close(); }
}
export async function listSyncJobs(ownerId: string) {
  const db = await database();
  try { return (await db.getAll("syncQueue")).filter((job) => job.ownerId === ownerId); } finally { db.close(); }
}
export async function completeSyncJob(job: SyncJob, state: "synced" | "failed") {
  const db = await database();
  try {
    const tx = db.transaction(["syncQueue", "sessionMeta"], "readwrite");
    if (state === "synced") await tx.objectStore("syncQueue").delete(job.id);
    const meta = await tx.objectStore("sessionMeta").get(job.sessionId);
    if (meta && meta.ownerId === job.ownerId)
      await tx.objectStore("sessionMeta").put({
        ...meta,
        syncState: state === "failed" ? (job.action === "delete" ? "delete-pending" : "failed") : (job.action === "delete" ? "local" : "synced"),
        updatedAt: new Date().toISOString(),
      });
    await tx.done;
  } finally { db.close(); }
  announceChange();
}
export async function claimGuestSession(sessionId: string, ownerId: string) {
  const db = await database();
  try {
    const tx = db.transaction(["sessions", "sessionMeta"], "readwrite");
    const session = await tx.objectStore("sessions").get(sessionId);
    const meta = await tx.objectStore("sessionMeta").get(sessionId);
    if (!session || !isCountedGuestWorkout(session) || meta?.ownerId) throw new Error("This workout is not eligible for import.");
    await tx.objectStore("sessionMeta").put({ sessionId, ownerId, syncState: "synced", updatedAt: new Date().toISOString() });
    await tx.done;
  } finally { db.close(); }
  announceChange();
}
export async function queueCloudDelete(ownerId: string, sessionId: string) {
  const db = await database();
  try {
    const tx = db.transaction(["syncQueue", "sessionMeta"], "readwrite");
    const job: SyncJob = { id: `${ownerId}:${sessionId}:delete`, ownerId, sessionId, action: "delete", createdAt: new Date().toISOString() };
    await tx.objectStore("syncQueue").put(job);
    const meta = await tx.objectStore("sessionMeta").get(sessionId);
    if (meta?.ownerId === ownerId) await tx.objectStore("sessionMeta").put({ ...meta, syncState: "delete-pending", updatedAt: new Date().toISOString() });
    await tx.done;
    return job;
  } finally { db.close(); }
}
export async function deleteAll() {
  const db = await database();
  try {
    const tx = db.transaction(["sessions", "profiles", "drafts", "settings", "sessionMeta", "guestReservations", "syncQueue"], "readwrite");
    for (const name of ["sessions", "profiles", "drafts", "settings", "sessionMeta", "guestReservations", "syncQueue"] as const)
      await tx.objectStore(name).clear();
    await tx.done;
    announceChange();
  } finally { db.close(); }
}
