import "fake-indexeddb/auto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { samplePair } from "./fixtures";
import type { Session } from "./schema";
import {
  deleteAll,
  deleteSession,
  getGuestUsage,
  getSessionMeta,
  listSyncJobs,
  releaseGuestReservation,
  reserveGuestWorkout,
  saveSession,
} from "./storage";
import { processSyncQueue } from "@/lib/cloud/sync";

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
describe("guest workout quota", () => {
  beforeEach(resetDatabase);
  afterEach(() => vi.unstubAllGlobals());

  it("counts a real session once and never restores allowance after deletion", async () => {
    const session = freshLive();
    await saveSession(session);
    await saveSession(session);
    expect(await getGuestUsage()).toBe(1);
    await deleteSession(session.id);
    expect(await getGuestUsage()).toBe(1);
    await deleteAll();
    expect(await getGuestUsage()).toBe(1);
  });

  it("blocks a sixth guest save but allows authenticated saves", async () => {
    for (let index = 0; index < 5; index++) await saveSession(freshLive());
    await expect(saveSession(freshLive())).rejects.toThrow("Five free workouts");
    await expect(saveSession(freshLive(), { ownerId: "user_verified" })).resolves.toBeUndefined();
    expect(await getGuestUsage()).toBe(5);
  });

  it("does not count synthetic demonstrations", async () => {
    const [sample] = samplePair();
    await saveSession(sample);
    expect(await getGuestUsage()).toBe(0);
  });

  it("serializes the final slot across browser-tab reservations", async () => {
    for (let index = 0; index < 4; index++) await saveSession(freshLive());
    const ids = [crypto.randomUUID(), crypto.randomUUID()];
    const results = await Promise.all(ids.map(reserveGuestWorkout));
    expect(results.filter((result) => result.allowed)).toHaveLength(1);
    await Promise.all(ids.map(releaseGuestReservation));
  });

  it("keeps an authenticated workout local and queued when cloud sync fails", async () => {
    const session = freshLive();
    await saveSession(session, { ownerId: "user_A", queueCloudSync: true });
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));
    const [result] = await processSyncQueue("user_A");
    expect(result.error).toBe("offline");
    expect(await listSyncJobs("user_A")).toHaveLength(1);
    expect((await getSessionMeta(session.id))?.syncState).toBe("failed");
  });
});
