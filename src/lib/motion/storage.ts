import { openDB, type DBSchema } from "idb";
import type { Capture, Profile, Sample, Session } from "./schema";
import { parseSession, buildSession } from "./session";

const TIGER_TOKEN = "tiger-device-token";
const TIGER_TRENDS = "tiger-trends";

interface Draft { id: string; createdAt: string; profile: Profile; capture: Capture; samples: Sample[]; }
export type SyncState = "local" | "pending" | "synced" | "failed" | "delete-pending";
export interface SessionMeta { sessionId: string; syncState: SyncState; updatedAt: string; }
export interface SyncJob { id: string; sessionId: string; action: "upload" | "delete"; createdAt: string; }
interface MotionDB extends DBSchema {
  sessions: { key: string; value: Session; indexes: { createdAt: string } };
  profiles: { key: string; value: Profile };
  drafts: { key: string; value: Draft };
  settings: { key: string; value: string };
  sessionMeta: { key: string; value: SessionMeta };
  syncQueue: { key: string; value: SyncJob };
}

async function database() {
  let expired = false;
  const opening = openDB<MotionDB>("menhel-motion", 3, {
    upgrade(db, oldVersion, _newVersion, transaction) {
      if (oldVersion === 0) {
        const sessions = db.createObjectStore("sessions", { keyPath: "id" });
        sessions.createIndex("createdAt", "createdAt");
        db.createObjectStore("profiles", { keyPath: "id" });
        db.createObjectStore("drafts", { keyPath: "id" });
        db.createObjectStore("settings");
        db.createObjectStore("sessionMeta", { keyPath: "sessionId" });
        db.createObjectStore("syncQueue", { keyPath: "id" });
      } else if (oldVersion < 2) {
        db.createObjectStore("sessionMeta", { keyPath: "sessionId" });
        db.createObjectStore("syncQueue", { keyPath: "id" });
      }
      if (oldVersion > 0 && oldVersion < 3) {
        transaction.objectStore("syncQueue").clear();
        transaction.objectStore("sessionMeta").clear();
      }
    },
    blocking() { void opening.then((db) => db.close()); },
  });
  let timer: ReturnType<typeof setTimeout>;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => { expired = true; reject(new Error("Local storage is blocked or unavailable. Close other app tabs and retry.")); }, 5000);
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
function syncable(session: Session) {
  return session.source === "live" && !session.importedFrom && ["complete", "interrupted"].includes(session.status);
}
function newToken() {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return btoa(String.fromCharCode(...bytes)).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
}

export async function tigerTrendsEnabled() {
  const db = await database();
  try { return (await db.get("settings", TIGER_TRENDS)) === "enabled"; }
  finally { db.close(); }
}
export async function tigerDeviceToken() {
  const db = await database();
  try { return (await db.get("settings", TIGER_TOKEN)) ?? null; }
  finally { db.close(); }
}
export async function startTigerTrends() {
  const db = await database();
  try {
    const tx = db.transaction(["settings", "sessions", "sessionMeta", "syncQueue"], "readwrite");
    const token = (await tx.objectStore("settings").get(TIGER_TOKEN)) ?? newToken();
    await tx.objectStore("settings").put(token, TIGER_TOKEN);
    await tx.objectStore("settings").put("enabled", TIGER_TRENDS);
    for (const session of await tx.objectStore("sessions").getAll()) {
      if (!syncable(session)) continue;
      await tx.objectStore("syncQueue").put({ id: session.id, sessionId: session.id, action: "upload", createdAt: new Date().toISOString() });
      await tx.objectStore("sessionMeta").put({ sessionId: session.id, syncState: "pending", updatedAt: new Date().toISOString() });
    }
    await tx.done;
    return token;
  } finally { db.close(); announceChange(); }
}
export async function stopTigerTrends() {
  const db = await database();
  try {
    const tx = db.transaction(["settings", "sessionMeta", "syncQueue"], "readwrite");
    await tx.objectStore("settings").delete(TIGER_TOKEN);
    await tx.objectStore("settings").delete(TIGER_TRENDS);
    await tx.objectStore("syncQueue").clear();
    for (const meta of await tx.objectStore("sessionMeta").getAll())
      await tx.objectStore("sessionMeta").put({ ...meta, syncState: "local", updatedAt: new Date().toISOString() });
    await tx.done;
  } finally { db.close(); announceChange(); }
}

export async function saveSession(session: Session) {
  const checked = parseSession(JSON.stringify(session));
  const db = await database();
  try {
    const tx = db.transaction(["sessions", "profiles", "drafts", "settings", "sessionMeta", "syncQueue"], "readwrite");
    const store = tx.objectStore("sessions");
    const exists = await store.get(checked.id);
    if (!exists && (await store.count()) >= 20) {
      tx.abort(); await tx.done.catch(() => {});
      throw new Error("Twenty sessions are already saved. Delete a session before saving another.");
    }
    await store.put(checked);
    await tx.objectStore("profiles").put(checked.profile);
    await tx.objectStore("drafts").delete(checked.id);
    if (syncable(checked) && (await tx.objectStore("settings").get(TIGER_TRENDS)) === "enabled") {
      await tx.objectStore("syncQueue").put({ id: checked.id, sessionId: checked.id, action: "upload", createdAt: new Date().toISOString() });
      await tx.objectStore("sessionMeta").put({ sessionId: checked.id, syncState: "pending", updatedAt: new Date().toISOString() });
    }
    await tx.done;
    announceChange();
  } finally { db.close(); }
}
export async function getSession(id: string) {
  const db = await database();
  try { const session = await db.get("sessions", id); return session ? parseSession(JSON.stringify(session)) : null; }
  finally { db.close(); }
}
export async function listSessions() {
  const db = await database();
  try { return (await db.getAllFromIndex("sessions", "createdAt")).reverse().map((s) => parseSession(JSON.stringify(s))); }
  finally { db.close(); }
}
export async function getSessionMeta(sessionId: string) {
  const db = await database();
  try { return await db.get("sessionMeta", sessionId); }
  finally { db.close(); }
}
export async function getProfile(id: string) {
  const db = await database();
  try { return await db.get("profiles", id); }
  finally { db.close(); }
}
export async function checkpoint(draft: Draft) {
  const db = await database();
  try {
    const tx = db.transaction("drafts", "readwrite");
    if (!(await tx.store.get(draft.id)) && (await tx.store.count()) >= 20) {
      tx.abort(); await tx.done.catch(() => {});
      throw new Error("Draft storage is full. Recover or delete older drafts.");
    }
    await tx.store.put(draft); await tx.done;
  } finally { db.close(); }
}
export async function listDrafts() {
  const db = await database();
  try { return await db.getAll("drafts"); }
  finally { db.close(); }
}
export async function recoverDraft(id: string) {
  const db = await database(); let draft;
  try { draft = await db.get("drafts", id); } finally { db.close(); }
  if (!draft) throw new Error("Draft no longer exists");
  const session = buildSession(draft.samples, draft.profile, draft.capture, "interrupted", "live", draft.id);
  session.createdAt = draft.createdAt;
  await saveSession(session);
  return session;
}
export async function deleteDraft(id: string) {
  const db = await database();
  try { await db.delete("drafts", id); } finally { db.close(); }
}
export async function deleteSession(id: string) {
  const db = await database();
  try {
    const tx = db.transaction(["sessions", "profiles", "drafts", "settings", "sessionMeta", "syncQueue"], "readwrite");
    const session = await tx.objectStore("sessions").get(id);
    await tx.objectStore("sessions").delete(id);
    if ((await tx.objectStore("settings").get(TIGER_TRENDS)) === "enabled" && session && syncable(session)) {
      await tx.objectStore("syncQueue").put({ id, sessionId: id, action: "delete", createdAt: new Date().toISOString() });
      await tx.objectStore("sessionMeta").put({ sessionId: id, syncState: "delete-pending", updatedAt: new Date().toISOString() });
    } else await tx.objectStore("sessionMeta").delete(id);
    if (session) {
      const sessions = await tx.objectStore("sessions").getAll();
      const drafts = await tx.objectStore("drafts").getAll();
      if (!sessions.some((item) => item.profile.id === session.profile.id) && !drafts.some((item) => item.profile.id === session.profile.id))
        await tx.objectStore("profiles").delete(session.profile.id);
    }
    await tx.done; announceChange();
  } finally { db.close(); }
}
export async function listSyncJobs() {
  const db = await database();
  try { return await db.getAll("syncQueue"); }
  finally { db.close(); }
}
export async function completeSyncJob(job: SyncJob, state: "synced" | "failed") {
  const db = await database();
  try {
    const tx = db.transaction(["syncQueue", "sessionMeta"], "readwrite");
    const current = await tx.objectStore("syncQueue").get(job.id);
    if (!current || current.action !== job.action || current.createdAt !== job.createdAt) { await tx.done; return; }
    if (state === "synced") await tx.objectStore("syncQueue").delete(job.id);
    if (job.action === "delete" && state === "synced") await tx.objectStore("sessionMeta").delete(job.sessionId);
    else {
      const meta = await tx.objectStore("sessionMeta").get(job.sessionId);
      if (meta) await tx.objectStore("sessionMeta").put({ ...meta, syncState: state === "failed" ? (job.action === "delete" ? "delete-pending" : "failed") : "synced", updatedAt: new Date().toISOString() });
    }
    await tx.done;
  } finally { db.close(); }
  announceChange();
}
export async function deleteAll() {
  const db = await database();
  try {
    const tx = db.transaction(["sessions", "profiles", "drafts", "settings", "sessionMeta", "syncQueue"], "readwrite");
    const trends = (await tx.objectStore("settings").get(TIGER_TRENDS)) === "enabled";
    for (const session of await tx.objectStore("sessions").getAll()) {
      if (!trends || !syncable(session)) continue;
      await tx.objectStore("syncQueue").put({ id: session.id, sessionId: session.id, action: "delete", createdAt: new Date().toISOString() });
      await tx.objectStore("sessionMeta").put({ sessionId: session.id, syncState: "delete-pending", updatedAt: new Date().toISOString() });
    }
    for (const name of ["sessions", "profiles", "drafts"] as const) await tx.objectStore(name).clear();
    await tx.done; announceChange();
  } finally { db.close(); }
}
