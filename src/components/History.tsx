"use client";
import { useEffect, useState } from "react";
import type { Session } from "@/lib/motion/schema";
import { MAX_BYTES } from "@/lib/motion/schema";
import {
  listSessions,
  saveSession,
  deleteSession,
  deleteAll,
  download,
  listDrafts,
  recoverDraft,
  deleteDraft,
} from "@/lib/motion/storage";
import { parseSession } from "@/lib/motion/session";
import { samplePair } from "@/lib/motion/fixtures";
export default function History() {
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
    const [s, d] = await Promise.all([listSessions(), listDrafts()]);
    display(s, d);
  }
  useEffect(() => {
    void Promise.all([listSessions(), listDrafts()])
      .then(([s, d]) => display(s, d))
      .catch((e) => setMessage(`Local storage unavailable: ${e.message}`));
  }, []);
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
      <section className="panel">
        <h2>Try a sample</h2>
        <p>
          These are authored synthetic joint sequences. They demonstrate replay
          and comparison, not a recorded person or model accuracy.
        </p>
        <button
          className="secondary-button"
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
          Open synthetic sample pair
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
              {new Date(s.createdAt).toLocaleString()} · {s.status}
            </p>
            <div className="actions">
              <a className="secondary-button" href={`/replay?id=${s.id}`}>
                Replay
              </a>
              <button className="secondary-button" onClick={() => download(s)}>
                Export
              </button>
              <button
                className="secondary-button"
                disabled={busy}
                onClick={() => {
                  if (
                    confirm(
                      "Delete this saved session? Export it first if you want to keep a copy.",
                    )
                  )
                    void action(() => deleteSession(s.id));
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
                    await recoverDraft(d.id);
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
      <section className="panel">
        <h2>Your data controls</h2>
        <label>
          Import a session JSON file, up to 5 MiB
          <input
            type="file"
            accept="application/json,.json"
            disabled={busy}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              void action(async () => {
                if (file.size > MAX_BYTES)
                  throw new Error("Import exceeds 5 MiB");
                const imported = parseSession(await file.text());
                imported.importedFrom = imported.importedFrom ?? imported.id;
                imported.id = crypto.randomUUID();
                await saveSession(imported);
              });
              e.target.value = "";
            }}
          />
        </label>
        <p>
          Imports keep the declared original source. Measurements are recomputed
          from landmarks; source declarations are not proof of camera
          provenance.
        </p>
        <div className="actions">
          <button
            className="secondary-button"
            onClick={() => {
              void navigator.storage
                ?.persist?.()
                .then((granted) =>
                  setMessage(
                    granted
                      ? "Browser granted persistent storage. Keep exports as a backup."
                      : "Persistence was not granted. Data can still be evicted; keep exports as a backup.",
                  ),
                );
            }}
          >
            Request persistent storage
          </button>
          <button
            className="secondary-button"
            disabled={busy}
            onClick={() => {
              if (
                confirm(
                  "Delete all sessions, calibration profiles and drafts on this device? This cannot be undone.",
                )
              )
                void action(deleteAll);
            }}
          >
            Delete all local movement data
          </button>
        </div>
        <p>
          No account or cloud backup. Clearing browser data may remove your
          sessions.
        </p>
      </section>
    </>
  );
}
