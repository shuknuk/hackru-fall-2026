"use client";
import { useEffect, useRef, useState } from "react";
import type { Session, Sample, Rep } from "@/lib/motion/schema";
import { advanceSquatReplay, squatReplayTime } from "@/lib/motion/replay";
import { sampleAt } from "@/lib/motion/compare";
import { CONNECTIONS } from "@/lib/motion/analysis";
import { jointVisible } from "@/lib/pose/types";
export function Skeleton({
  sample,
  width,
  height,
  label,
}: {
  sample: Sample | null;
  width: number;
  height: number;
  label: string;
}) {
  const canvas = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = canvas.current;
    if (!c) return;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    c.width = width;
    c.height = height;
    ctx.clearRect(0, 0, width, height);
    if (!sample) return;
    ctx.strokeStyle = "#cce991";
    ctx.fillStyle = "#f6f5ed";
    ctx.lineWidth = 3;
    for (const [a, b] of CONNECTIONS) {
      const p = sample.joints[a - 11],
        q = sample.joints[b - 11];
      if (!jointVisible(p) || !jointVisible(q)) continue;
      ctx.beginPath();
      ctx.moveTo(p.x * width, p.y * height);
      ctx.lineTo(q.x * width, q.y * height);
      ctx.stroke();
    }
    for (const p of sample.joints) {
      if (!jointVisible(p)) continue;
      ctx.beginPath();
      ctx.arc(p.x * width, p.y * height, 4, 0, Math.PI * 2);
      ctx.fill();
    }
  }, [sample, width, height]);
  return (
    <div className="skeleton" style={{ aspectRatio: `${width}/${height}` }}>
      <canvas ref={canvas} aria-label={label} role="img" />
      {!sample ? (
        <span className="camera-placeholder">
          Tracking gap · no interpolated pose
        </span>
      ) : null}
    </div>
  );
}
export function AngleValues({ sample }: { sample: Sample | null }) {
  return (
    <p className="angle-values">
      Estimated knee flexion{" "}
      {sample?.filtered == null
        ? "unavailable"
        : `${sample.filtered.toFixed(0)}°`}{" "}
      · Estimated hip flexion{" "}
      {sample?.hip == null ? "unavailable" : `${sample.hip.toFixed(0)}°`} ·
      Projected torso lean{" "}
      {sample?.lean == null ? "unavailable" : `${sample.lean.toFixed(0)}°`}
    </p>
  );
}
function Trace({
  session,
  start,
  end,
  time,
  completedOnly,
}: {
  session: Session;
  start: number;
  end: number;
  time: number;
  completedOnly: boolean;
}) {
  let path = "",
    prev = -Infinity;
  for (const s of session.samples) {
    if (s.t < start || s.t > end || s.filtered === null || !s.valid || (completedOnly && !session.reps.some((rep) => s.t >= rep.start && s.t <= rep.end))) {
      prev = -Infinity;
      continue;
    }
    const x = ((s.t - start) / Math.max(1, end - start)) * 600,
      y = 115 - (s.filtered / 180) * 100;
    path += `${s.t - prev > 150 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)} `;
    prev = s.t;
  }
  return (
    <svg
      className="angle-trace"
      viewBox="0 0 600 130"
      role="img"
      aria-label="Estimated knee-flexion trace over the selected recorded interval"
    >
      <path d={path} fill="none" stroke="currentColor" strokeWidth="2" />
      <line
        x1={((time - start) / Math.max(1, end - start)) * 600}
        x2={((time - start) / Math.max(1, end - start)) * 600}
        y1="0"
        y2="125"
        stroke="#8a4b20"
      />
      <text x="0" y="128" fontSize="12">
        Recorded time →
      </text>
    </svg>
  );
}
export default function ReplayPlayer({ session }: { session: Session }) {
  const [selected, setSelected] = useState(-1);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [time, setTime] = useState(session.reps[0]?.start ?? 0);
  const rep: Rep | undefined = session.reps[selected];
  const start = rep?.start ?? session.reps[0]?.start ?? 0,
    end = rep?.end ?? session.reps.at(-1)?.end ?? 0;
  const clock = useRef(time);
  useEffect(() => {
    clock.current = time;
  }, [time]);
  useEffect(() => {
    if (!playing) return;
    let frame = 0,
      last = performance.now(),
      lastRender = last;
    function tick(now: number) {
      clock.current = selected < 0
        ? advanceSquatReplay(session.reps, clock.current, (now - last) * speed)
        : Math.min(end, clock.current + (now - last) * speed);
      last = now;
      if (now - lastRender >= 50 || clock.current >= end) {
        setTime(clock.current);
        lastRender = now;
      }
      if (clock.current >= end) {
        setPlaying(false);
        return;
      }
      frame = requestAnimationFrame(tick);
    }
    frame = requestAnimationFrame(tick);
    const hide = () => {
      if (document.hidden) setPlaying(false);
    };
    document.addEventListener("visibilitychange", hide);
    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener("visibilitychange", hide);
    };
  }, [playing, speed, end, selected, session.reps]);
  function choose(index: number) {
    setSelected(index);
    setPlaying(false);
    setTime(index < 0 ? session.reps[0]?.start ?? 0 : session.reps[index].start);
  }
  const sample = session.reps.length ? sampleAt(session.samples, time) : null;
  return (
    <section className="panel" aria-labelledby="player-title">
      <h2 id="player-title">Movement replay</h2>
      <p>
        A skeleton reconstructed from stored body landmarks. No video was
        recorded.
      </p>
      <label>
        Replay interval
        <select
          value={selected}
          onChange={(e) => choose(Number(e.target.value))}
        >
          <option value={-1}>Whole set - completed squats only</option>
          {session.reps.map((r, i) => (
            <option key={r.id} value={i}>
              Rep {r.id}
            </option>
          ))}
        </select>
      </label>
      <Skeleton
        sample={sample}
        width={session.capture.width}
        height={session.capture.height}
        label="Recorded skeleton"
      />
      <AngleValues sample={sample} />
      <div className="actions">
        <button
          className="secondary-button"
          disabled={!session.reps.length}
          onClick={() => {
            if (time >= end) setTime(start);
            setPlaying((p) => !p);
          }}
        >
          {playing ? "Pause" : "Play"}
        </button>
        <button
          className="secondary-button"
          disabled={!session.reps.length || selected <= 0}
          onClick={() => choose(selected - 1)}
        >
          Previous rep
        </button>
        <button
          className="secondary-button"
          disabled={!session.reps.length || selected >= session.reps.length - 1}
          onClick={() => choose(selected + 1)}
        >
          Next rep
        </button>
        <label>
          Playback speed
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
        Recorded time
        <input
          type="range"
          min={start}
          max={Math.max(start + 1, end)}
          step={10}
          value={time}
          onChange={(e) => {
            setPlaying(false);
            setTime(selected < 0 ? squatReplayTime(session.reps, Number(e.target.value)) : Number(e.target.value));
          }}
        />
      </label>
      <p>
        {(time / 1000).toFixed(2)} s of {(end / 1000).toFixed(2)} s ·{" "}
        {sample ? "Valid knee sample" : "Tracking unavailable"}
      </p>
      <Trace session={session} start={start} end={end} time={time} completedOnly={selected < 0} />
      {rep ? (
        <p>
          Rep {rep.id} · peak estimated knee bend {rep.peak?.toFixed(0)}° ·
          descent {(rep.descent / 1000).toFixed(2)} s · ascent{" "}
          {(rep.ascent / 1000).toFixed(2)} s · valid coverage{" "}
          {(rep.coverage * 100).toFixed(0)}%
        </p>
      ) : null}
    </section>
  );
}
