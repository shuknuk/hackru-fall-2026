"use client";
import { useEffect, useState } from "react";
import type { Session } from "@/lib/motion/schema";

import {
  listSessions,
  saveSession,
  deleteSession,
  listDrafts,
  recoverDraft,
  deleteDraft,
} from "@/lib/motion/storage";

import GeminiProgress from "./GeminiProgress";
import { samplePair } from "@/lib/motion/fixtures";
import { cloudSyncEnabled } from "@/lib/motion/storage";
import { useAccount } from "./AuthContext";
import SessionStorageStatus from "./SessionStorageStatus";
export default function History() {
  const { userId } = useAccount();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [drafts, setDrafts] = useState<{ id: string; createdAt: string }[]>([]);
  const [message, setMessage] = useState("Loading local history…");
  const [busy, setBusy] = useState(false);
  const [a, setA] = useState("");
  const [b, setB] = useState("");
  function display(s: Session[], d: { id: string; createdAt: string }[]) {
    setSessions(s);
    setDrafts(d);
    setMessage(
      s.length
        ? `${s.length} of 20 session slots used.`
        : "No saved sessions yet. Record a set or open the labelled sample.",
    );
  }
  async function refresh() {
    const [s, d] = await Promise.all([listSessions(userId), listDrafts()]);
    display(s, d);
  }
  useEffect(() => {
    void Promise.all([listSessions(userId), listDrafts()])
      .then(([s, d]) => display(s, d))
      .catch((e) => setMessage(`Local storage unavailable: ${e.message}`));
  }, [userId]);
  async function action(work: () => Promise<void>) {
    setBusy(true);
    try {
      await work();
      await refresh();
    } catch (e) {
      setMessage(
        e instanceof Error ? e.message : "Local storage operation failed",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <p role="status">{message}</p>
      <div className="actions">
        <a className="button" href="/results/saved">View all saved results</a>
      </div>
      <section className="panel">
        <h2>Try two demo squat sets</h2>
        <p className="sample-pair-description">
          See two demo sets of three bodyweight squats. Explore their skeleton replays
          and compare squat depth and timing. These artificial examples are not recordings of a person.
        </p>
        <button
          className="button sample-pair-button"
          disabled={busy}
          onClick={() =>
            void action(async () => {
              const [x, y] = samplePair();
              await saveSession(x);
              await saveSession(y);
              window.location.assign(
                new URL(`/compare?a=${x.id}&b=${y.id}`, window.location.origin)
                  .href,
              );
            })
          }
        >
          Open squat sample pair
        </button>
      </section>
      <section className="panel">
        <h2>Compare two attempts</h2>
        <div className="compare-grid">
          {[
            [a, setA, "Set A"],
            [b, setB, "Set B"],
          ].map(([value, setter, label]) => (
            <label key={label as string}>
              {label as string}
              <select
                value={value as string}
                onChange={(e) =>
                  (setter as (v: string) => void)(e.target.value)
                }
              >
                <option value="">Choose a saved set</option>
                {sessions.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.source} · {new Date(s.createdAt).toLocaleString()} ·{" "}
                    {s.reps.length} reps
                  </option>
                ))}
              </select>
            </label>
          ))}
        </div>
        {a && b && a !== b ? (
          <a className="button" href={`/compare?a=${a}&b=${b}`}>
            Compare selected sets
          </a>
        ) : (
          <p>Select two different sets.</p>
        )}
      </section>
      <GeminiProgress sessions={sessions} />
      <section aria-labelledby="history-title">
        <h2 id="history-title">Saved on this device</h2>
        {sessions.map((s) => (
          <article className="panel" key={s.id}>
            <p className="eyebrow">
              {s.importedFrom
                ? `IMPORTED · DECLARED SOURCE ${s.source}`
                : s.source === "live"
                  ? "PERSONAL CAPTURE"
                  : s.source === "sample-synthetic"
                    ? "SYNTHETIC SAMPLE"
                    : "RECORDED SAMPLE"}
            </p>
            <h3>{s.reps.length} completed reps</h3>
            <p>
              {new Date(s.createdAt).toLocaleString()} · {s.status} · <SessionStorageStatus sessionId={s.id} />
            </p>
            <div className="actions">
              <a className="secondary-button" href={`/results?id=${s.id}`}>
                View results
              </a>
              <a className="secondary-button" href={`/replay?id=${s.id}`}>
                Replay
              </a>
<button
                className="secondary-button"
                disabled={busy}
                onClick={() => {
                  if (
                    confirm(
                      "Delete this saved session? This cannot be undone.",
                    )
                  )
                    void action(() => deleteSession(s.id, userId));
                }}
              >
                Delete
              </button>
            </div>
          </article>
        ))}
      </section>
      {drafts.length ? (
        <section className="panel">
          <h2>Interrupted drafts</h2>
          <p>
            Checkpointed data may omit the last two seconds. Recovery excludes
            unfinished repetitions.
          </p>
          {drafts.map((d) => (
            <div className="actions" key={d.id}>
              <span>{new Date(d.createdAt).toLocaleString()}</span>
              <button
                className="secondary-button"
                disabled={busy}
                onClick={() =>
                  void action(async () => {
                    await recoverDraft(d.id, userId, userId ? await cloudSyncEnabled(userId) : false);
                  })
                }
              >
                Recover draft
              </button>
              <button
                className="secondary-button"
                disabled={busy}
                onClick={() => {
                  if (confirm("Delete this draft?"))
                    void action(() => deleteDraft(d.id));
                }}
              >
                Delete draft
              </button>
            </div>
          ))}
        </section>
      ) : null}
    </>
  );
}
