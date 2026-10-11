"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import type { Session } from "@/lib/motion/schema";
import { getSession } from "@/lib/motion/storage";
import { useAccount } from "./AuthContext";
import {
  compatibility,
  observations,
  alignedTime,
  sampleAt,
  spatialReference,
  comparisonPose,
} from "@/lib/motion/compare";
import { summary } from "@/lib/motion/analysis";
import { Skeleton, AngleValues } from "./ReplayPlayer";
import GeminiCoach from "./GeminiCoach";
export default function CompareSessions() {
  const { userId } = useAccount();
  const [sets, setSets] = useState<[Session, Session] | null>(null);
  const [message, setMessage] = useState("Loading two local sets…");
  const [confirmed, setConfirmed] = useState(false);
  const [repA, setRepA] = useState(0),
    [repB, setRepB] = useState(0);
  const [progress, setProgress] = useState(0),
    [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const clock = useRef(0);
  useEffect(() => {
    async function load(): Promise<[Session, Session]> {
      const q = new URLSearchParams(location.search),
        a = q.get("a"),
        b = q.get("b");
      if (!a || !b || a === b)
        throw new Error("Select two different sessions from history.");
      const [x, y] = await Promise.all([getSession(a, userId), getSession(b, userId)]);
      if (!x || !y)
        throw new Error("One of these sessions is missing on this device.");
      return [x, y];
    }
    void load()
      .then(setSets)
      .catch((e) => setMessage(e.message));
  }, [userId]);
  const refs = useMemo(() => sets?.map(spatialReference), [sets]);
  useEffect(() => {
    clock.current = progress;
  }, [progress]);
  useEffect(() => {
    if (!playing) return;
    let frame = 0,
      last = performance.now(),
      renderAt = last;
    function tick(now: number) {
      clock.current = Math.min(
        1,
        clock.current + ((now - last) / 6000) * speed,
      );
      last = now;
      if (now - renderAt >= 50 || clock.current >= 1) {
        setProgress(clock.current);
        renderAt = now;
      }
      if (clock.current >= 1) {
        setPlaying(false);
        return;
      }
      frame = requestAnimationFrame(tick);
    }
    frame = requestAnimationFrame(tick);
    const hidden = () => {
      if (document.hidden) setPlaying(false);
    };
    document.addEventListener("visibilitychange", hidden);
    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener("visibilitychange", hidden);
    };
  }, [playing, speed]);
  if (!sets)
    return (
      <p role="status">
        {message} <a href="/history">Open history</a>
      </p>
    );
  const [a, b] = sets,
    check = compatibility(a, b, confirmed),
    sa = summary(a.reps),
    sb = summary(b.reps),
    evidence = check.allowed ? observations(a, b) : [];
  const ra = a.reps[repA],
    rb = b.reps[repB];
  const ta = ra ? alignedTime(ra, progress) : 0,
    tb = rb ? alignedTime(rb, progress) : 0;
  const samples = [sampleAt(a.samples, ta), sampleAt(b.samples, tb)];
  return (
    <>
      <section className="panel">
        <p className="eyebrow">
          {a.source === "live" && b.source === "live"
            ? "PERSONAL ATTEMPTS"
            : "DEMO SQUAT COMPARISON"}
        </p>
        <label className="check">
          <input
            type="checkbox"
            checked={confirmed}
            onChange={(e) => {
              setConfirmed(e.target.checked);
              setPlaying(false);
            }}
          />
          {a.source === "sample-synthetic"
            ? "I understand these are artificial demo squat sets."
            : "These sets are from the same person with comparable camera placement."}
        </label>
        <h2>{check.status}</h2>
        {check.reasons.map((r) => (
          <p key={r}>{r}</p>
        ))}
        <p>
          More movement is not automatically better movement. Estimated angles
          are projected from a single camera.
        </p>
      </section>
      <div className="compare-grid">
        {[a, b].map((s, i) => (
          <section className="panel" key={s.id}>
            <h2>Set {i === 0 ? "A" : "B"}</h2>
            <p>
              {s.source} · {s.reps.length} completed reps · {s.status}
            </p>
            <p>
              Median knee bend{" "}
              {summary(s.reps).peak?.toFixed(0) ?? "unavailable"}° · Median
              ascent{" "}
              {summary(s.reps).ascent === null
                ? "unavailable"
                : ((summary(s.reps).ascent ?? 0) / 1000).toFixed(2) + " s"}
            </p>
            <a href={`/replay?id=${s.id}`}>Inspect this set</a>
          </section>
        ))}
      </div>
      {check.allowed && ra && rb ? (
        <>
          <section className="panel">
            <h2>Compare your squats side by side</h2>
            <p>
              Choose one squat from each set, then press Play. Both replays reach the bottom
              together so you can compare the same part of each squat. The table below shows how long each squat actually took.
            </p>
            <div className="compare-grid">
              {sets.map((s, i) => (
                <div key={s.id}>
                  <label>
                    Set {i === 0 ? "A" : "B"} repetition
                    <select
                      value={i === 0 ? repA : repB}
                      onChange={(e) => {
                        (i === 0 ? setRepA : setRepB)(Number(e.target.value));
                        setPlaying(false);
                        setProgress(0);
                      }}
                    >
                      {s.reps.map((r, j) => (
                        <option value={j} key={r.id}>
                          Rep {r.id}
                        </option>
                      ))}
                    </select>
                  </label>
                  <Skeleton
                    sample={comparisonPose(s, samples[i], refs?.[i] ?? null)}
                    width={640}
                    height={480}
                    label={`Set ${i === 0 ? "A" : "B"} phase-aligned skeleton`}
                  />
                  <AngleValues sample={samples[i]} />
                  <p>
                    Original recorded time{" "}
                    {((i === 0 ? ta : tb) / 1000).toFixed(2)} s
                  </p>
                  {!refs?.[i] ? (
                    <p>Insufficient standing geometry for spatial alignment.</p>
                  ) : null}
                </div>
              ))}
            </div>
            <div className="actions">
              <button
                className="secondary-button"
                onClick={() => {
                  if (progress >= 1) setProgress(0);
                  setPlaying((x) => !x);
                }}
              >
                {playing ? "Pause comparison" : "Play comparison"}
              </button>
              <label>
                Comparison speed
                <select
                  value={speed}
                  onChange={(e) => setSpeed(Number(e.target.value))}
                >
                  <option value={0.5}>0.5×</option>
                  <option value={1}>1×</option>
                </select>
              </label>
            </div>
            <label>
              Squat replay progress
              <input
                type="range"
                min={0}
                max={100}
                step={1}
                value={Math.round(progress * 100)}
                onChange={(e) => {
                  setPlaying(false);
                  setProgress(Number(e.target.value) / 100);
                }}
              />
            </label>
            <div className="replay-milestones" aria-hidden="true"><span>Standing</span><span>Bottom</span><span>Standing</span></div>
            <p role="status">
              {Math.round(progress * 100)}% ·{" "}
              {progress === 0 ? "Standing start" : progress === 1 ? "Back to standing" : progress === 0.5 ? "Bottom of squat" : progress < 0.5 ? "Lowering down" : "Standing back up"}
            </p>
            <table>
              <caption>How long each selected squat took</caption>
              <thead>
                <tr>
                  <th>Measurement</th>
                  <th>Set A</th>
                  <th>Set B</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <th>Lowering down</th>
                  <td>{(ra.descent / 1000).toFixed(2)} s</td>
                  <td>{(rb.descent / 1000).toFixed(2)} s</td>
                </tr>
                <tr>
                  <th>Standing back up</th>
                  <td>{(ra.ascent / 1000).toFixed(2)} s</td>
                  <td>{(rb.ascent / 1000).toFixed(2)} s</td>
                </tr>
                <tr>
                  <th>Tracked movement</th>
                  <td>{(ra.coverage * 100).toFixed(0)}%</td>
                  <td>{(rb.coverage * 100).toFixed(0)}%</td>
                </tr>
              </tbody>
            </table>
          </section>
          <section className="panel">
            <h2>What changed</h2>
            <p>
              Set medians use completed repetitions. Small differences are
              treated as uncertain.
            </p>
            <ul>
              {evidence.map((o) => (
                <li key={o.metric}>
                  <p>{o.text}</p>
                  <details>
                    <summary>Measurement evidence</summary>
                    <p>
                      Rule {o.metric} · Set A {a.id} · Set B {b.id}
                    </p>
                    <p>
                      Median knee bend {sa.peak?.toFixed(1)}° →{" "}
                      {sb.peak?.toFixed(1)}° · Median ascent{" "}
                      {((sa.ascent ?? 0) / 1000).toFixed(2)} s →{" "}
                      {((sb.ascent ?? 0) / 1000).toFixed(2)} s · Median coverage{" "}
                      {((sa.coverage ?? 0) * 100).toFixed(0)}% /{" "}
                      {((sb.coverage ?? 0) * 100).toFixed(0)}%
                    </p>
                  </details>
                </li>
              ))}
            </ul>
            <GeminiCoach setA={a} setB={b} evidence={evidence} />
          </section>
        </>
      ) : null}
    </>
  );
}
