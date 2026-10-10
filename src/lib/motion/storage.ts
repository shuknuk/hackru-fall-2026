import { openDB, type DBSchema } from "idb";
import type { Capture, Profile, Sample, Session } from "./schema";
import { parseSession, buildSession } from "./session";
interface Draft {
  id: string;
  createdAt: string;
  profile: Profile;
  capture: Capture;
  samples: Sample[];
}
interface MotionDB extends DBSchema {
  sessions: { key: string; value: Session; indexes: { createdAt: string } };
  profiles: { key: string; value: Profile };
  drafts: { key: string; value: Draft };
  settings: { key: string; value: string };
}
async function database() {
  let expired = false;
  const opening = openDB<MotionDB>("menhel-motion", 1, {
    upgrade(db) {
      const s = db.createObjectStore("sessions", { keyPath: "id" });
      s.createIndex("createdAt", "createdAt");
      db.createObjectStore("profiles", { keyPath: "id" });
      db.createObjectStore("drafts", { keyPath: "id" });
      db.createObjectStore("settings");
    },
    blocking() {
      void opening.then((db) => db.close());
    },
  });
  let timer: ReturnType<typeof setTimeout>;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      expired = true;
      reject(
        new Error(
          "Local storage is blocked or unavailable. Close other app tabs and retry.",
        ),
      );
    }, 5000);
  });
  opening.then(
    (db) => {
      if (expired) db.close();
    },
    () => {},
  );
  try {
    return await Promise.race([opening, timeout]);
  } finally {
    clearTimeout(timer!);
  }
}
export async function saveSession(session: Session) {
  const checked = parseSession(JSON.stringify(session));
  const db = await database();
  try {
    const tx = db.transaction(["sessions", "profiles", "drafts"], "readwrite");
    const store = tx.objectStore("sessions");
    const exists = await store.get(checked.id);
    if (!exists && (await store.count()) >= 20) {
      tx.abort();
      await tx.done.catch(() => {});
      throw new Error(
        "Twenty sessions are already saved. Export or delete a session before saving another.",
      );
    }
    await store.put(checked);
    await tx.objectStore("profiles").put(checked.profile);
    await tx.objectStore("drafts").delete(checked.id);
    await tx.done;
  } finally {
    db.close();
  }
}
export async function getSession(id: string) {
  const db = await database();
  try {
    const s = await db.get("sessions", id);
    return s ? parseSession(JSON.stringify(s)) : null;
  } finally {
    db.close();
  }
}
export async function listSessions() {
  const db = await database();
  try {
    const records = await db.getAllFromIndex("sessions", "createdAt");
    return records.reverse().map((s) => parseSession(JSON.stringify(s)));
  } finally {
    db.close();
  }
}
export async function getProfile(id: string) {
  const db = await database();
  try {
    return await db.get("profiles", id);
  } finally {
    db.close();
  }
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
  } finally {
    db.close();
  }
}
export async function listDrafts() {
  const db = await database();
  try {
    return await db.getAll("drafts");
  } finally {
    db.close();
  }
}
export async function recoverDraft(id: string) {
  const db = await database();
  let draft;
  try {
    draft = await db.get("drafts", id);
  } finally {
    db.close();
  }
  if (!draft) throw new Error("Draft no longer exists");
  const session = buildSession(
    draft.samples,
    draft.profile,
    draft.capture,
    "interrupted",
    "live",
    draft.id,
  );
  session.createdAt = draft.createdAt;
  await saveSession(session);
  return session;
}
export async function deleteDraft(id: string) {
  const db = await database();
  try {
    await db.delete("drafts", id);
  } finally {
    db.close();
  }
}
export async function deleteSession(id: string) {
  const db = await database();
  try {
    const tx = db.transaction(["sessions", "profiles", "drafts"], "readwrite");
    const s = await tx.objectStore("sessions").get(id);
    await tx.objectStore("sessions").delete(id);
    if (s) {
      const sessions = await tx.objectStore("sessions").getAll();
      const drafts = await tx.objectStore("drafts").getAll();
      if (
        !sessions.some((x) => x.profile.id === s.profile.id) &&
        !drafts.some((x) => x.profile.id === s.profile.id)
      )
        await tx.objectStore("profiles").delete(s.profile.id);
    }
    await tx.done;
  } finally {
    db.close();
  }
}
export async function deleteAll() {
  const db = await database();
  try {
    const tx = db.transaction(
      ["sessions", "profiles", "drafts", "settings"],
      "readwrite",
    );
    for (const name of ["sessions", "profiles", "drafts", "settings"] as const)
      await tx.objectStore(name).clear();
    await tx.done;
  } finally {
    db.close();
  }
}
export function download(session: Session) {
  const data = JSON.stringify(session);
  const url = URL.createObjectURL(
    new Blob([data], { type: "application/json" }),
  );
  const a = document.createElement("a");
  a.href = url;
  a.download = `menhel-${session.source}-${session.id}.json`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
