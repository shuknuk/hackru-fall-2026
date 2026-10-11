import "fake-indexeddb/auto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { samplePair } from "./fixtures";
import type { Session } from "./schema";
import { deleteSession, getSession, getSessionMeta, listSyncJobs, saveSession, startTigerTrends, stopTigerTrends, tigerDeviceToken } from "./storage";
import { processSyncQueue, withTigerSyncLock } from "@/lib/cloud/sync";

function freshLive(): Session {
  const [session] = samplePair();
  return { ...session, id: crypto.randomUUID(), source: "live" };
}
async function resetDatabase() {
  await new Promise<void>((resolve, reject) => {
    const request = indexedDB.deleteDatabase("menhel-motion");
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
    request.onblocked = () => reject(new Error("database deletion blocked"));
  });
}
describe("phone Tiger Data trends", () => {
  beforeEach(resetDatabase);
  afterEach(() => vi.unstubAllGlobals());

  it("preserves old account-owned recordings while discarding obsolete account upload jobs", async () => {
    const session = freshLive();
    await new Promise<void>((resolve, reject) => {
      const request = indexedDB.open("menhel-motion", 2);
      request.onupgradeneeded = () => {
        const db = request.result;
        db.createObjectStore("sessions", { keyPath: "id" }).createIndex("createdAt", "createdAt");
        for (const store of ["profiles", "drafts"]) db.createObjectStore(store, { keyPath: "id" });
        db.createObjectStore("settings");
        db.createObjectStore("sessionMeta", { keyPath: "sessionId" });
        db.createObjectStore("syncQueue", { keyPath: "id" });
      };
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const db = request.result;
        const tx = db.transaction(["sessions", "sessionMeta", "syncQueue"], "readwrite");
        tx.objectStore("sessions").put(session);
        tx.objectStore("sessionMeta").put({ sessionId: session.id, ownerId: "old-account", syncState: "pending" });
        tx.objectStore("syncQueue").put({ id: "old-account-job", ownerId: "old-account", sessionId: session.id, action: "upload" });
        tx.oncomplete = () => { db.close(); resolve(); };
        tx.onerror = () => { db.close(); reject(tx.error); };
      };
    });
    expect((await getSession(session.id))?.id).toBe(session.id);
    expect(await listSyncJobs()).toHaveLength(0);
    expect(await tigerDeviceToken()).toBeNull();
  });

  it("keeps recordings local until this phone starts trends, then queues current and future summaries", async () => {
    const first = freshLive();
    await saveSession(first);
    expect(await listSyncJobs()).toHaveLength(0);
    const token = await startTigerTrends();
    expect(token).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(await tigerDeviceToken()).toBe(token);
    expect(await listSyncJobs()).toMatchObject([{ sessionId: first.id, action: "upload" }]);
    const second = freshLive();
    await saveSession(second);
    expect(await listSyncJobs()).toHaveLength(2);
  });

  it("keeps a summary queued when Tiger Data is offline and queues remote deletion after local deletion", async () => {
    const session = freshLive();
    await startTigerTrends();
    await saveSession(session);
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));
    const [result] = await processSyncQueue();
    expect(result.error).toBe("offline");
    expect((await getSessionMeta(session.id))?.syncState).toBe("failed");
    await deleteSession(session.id);
    expect(await listSyncJobs()).toMatchObject([{ sessionId: session.id, action: "delete" }]);
  });

  it("removes the phone credential only when trends are explicitly deleted", async () => {
    await startTigerTrends();
    expect(await tigerDeviceToken()).not.toBeNull();
    await stopTigerTrends();
    expect(await tigerDeviceToken()).toBeNull();
    expect(await listSyncJobs()).toHaveLength(0);
  });
  it("waits for an in-flight upload before deleting cloud history", async () => {
    const order: string[] = [];
    let release!: () => void;
    const upload = withTigerSyncLock(async () => {
      await new Promise<void>((resolve) => { release = resolve; });
      order.push("upload");
    });
    const deletion = withTigerSyncLock(async () => { order.push("delete"); });
    await Promise.resolve();
    expect(order).toEqual([]);
    release();
    await Promise.all([upload, deletion]);
    expect(order).toEqual(["upload", "delete"]);
  });
});
