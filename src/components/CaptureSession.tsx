"use client";
import { useEffect, useRef, useState } from "react";
import PoseSpike from "./PoseSpike";
import type { Joint } from "@/lib/pose/types";
import {
  makeProfile,
  MAX_VALID_SAMPLE_INTERVAL_MS,
  measure,
  median,
  mad,
  Signal,
  SquatDetector,
} from "@/lib/motion/analysis";
import {
  MAX_SAMPLES,
  profileSchema,
  type Capture,
  type Profile,
  type Sample,
  type Session,
  type Side,
} from "@/lib/motion/schema";
import { buildSession, prepareSample } from "@/lib/motion/session";
import {
  checkpoint,
  getProfile,
  saveSession,
  download,
} from "@/lib/motion/storage";
import { summary } from "@/lib/motion/analysis";
type Calibration = {
  start: number | null;
  baseline: number | null;
  values: number[];
  peak: number;
  returnSince: number | null;
  signal: Signal;
  reuse: Profile | null;
};
type Recording = {
  id: string;
  createdAt: string;
  start: number;
  last: number;
  samples: Sample[];
  signal: Signal;
  detector: SquatDetector;
  profile: Profile;
  capture: Capture;
  checkpointAt: number;
  queue: Promise<void>;
  storageError: string | null;
};
export default function CaptureSession() {
  const [side, setSide] = useState<Side>("left");
  const [confirmed, setConfirmed] = useState(false);
  const [stage, setStage] = useState("positioning");
  const [notice, setNotice] = useState(
    "Start the camera, select the visible side, then confirm your setup.",
  );
  const [profile, setProfile] = useState<Profile | null>(null);
  const profileRef = useRef<Profile | null>(null);
  const meta = useRef<Capture | null>(null);
  const cal = useRef<Calibration | null>(null);
  const recording = useRef<Recording | null>(null);
  const clock = useRef(0);
  const lastUI = useRef(0);
  const poseTimes = useRef<number[]>([]);
  const [telemetry, setTelemetry] = useState({
    count: 0,
    knee: null as number | null,
    hip: null as number | null,
    seconds: 0,
    phase: "Waiting",
    poseRate: 0,
    tracking: "Waiting",
  });
  const cameraControl = useRef<{ stop: () => void } | null>(null);
  const [cameraReady, setCameraReady] = useState(false);
  const [result, setResult] = useState<Session | null>(null);
  const [saved, setSaved] = useState(false);
  useEffect(() => {
    const id = new URLSearchParams(location.search).get("profile");
    if (id)
      void getProfile(id)
        .then((p) => {
          if (p) {
            const checked = profileSchema.parse(p);
            profileRef.current = checked;
            setProfile(checked);
            setSide(checked.side);
            setNotice(
              "Previous calibration loaded. Keep the same placement and confirm your setup again.",
            );
          }
        })
        .catch((e) => setNotice(`Could not load setup: ${e.message}`));
  }, []);
  useEffect(() => {
    document.documentElement.dataset.recording = String(
      stage === "recording" || stage === "finishing",
    );
    window.dispatchEvent(new Event("menhel-recording"));
    return () => {
      delete document.documentElement.dataset.recording;
      window.dispatchEvent(new Event("menhel-recording"));
    };
  }, [stage]);
  useEffect(() => {
    if (stage !== "recording") return;
    const timer = setTimeout(() => {
      void finish();
    }, 90000);
    return () => clearTimeout(timer);
  }, [stage]);
  async function finish(status: Session["status"] = "complete") {
    const r = recording.current;
    if (!r) return;
    recording.current = null;
    cal.current = null;
    cameraControl.current?.stop();
    setCameraReady(false);
    setStage("finishing");
    try {
      if (!r.samples.length)
        throw new Error(
          "No pose samples were captured. Start another set after tracking is ready.",
        );
      const session = buildSession(
        r.samples,
        r.profile,
        r.capture,
        status,
        "live",
        r.id,
      );
      session.createdAt = r.createdAt;
      setResult(session);
      setSaved(false);
      await r.queue;
      await saveSession(session);
      setSaved(true);
      setNotice(
        "Set saved on this device. Open its replay or record another set with the same setup.",
      );
    } catch (e) {
      setNotice(
        `Set is not saved: ${e instanceof Error ? e.message : "Local storage error"}. Export the available result before leaving.`,
      );
    } finally {
      setStage("results");
    }
  }
  function onStopped(reason: string) {
    cal.current = null;
    if (recording.current) {
      void finish("interrupted");
      setNotice(
        `Set interrupted (${reason}). Only completed repetitions will be included.`,
      );
    } else {
      setStage("positioning");
      setNotice("Camera stopped. Restart and recheck setup before recording.");
    }
    meta.current = null;
    setCameraReady(false);
  }
  function beginCalibration(reuse: boolean) {
    if (!meta.current || !confirmed) return;
    cal.current = {
      start: null,
      baseline: null,
      values: [],
      peak: 0,
      returnSince: null,
      signal: new Signal(),
      reuse: reuse ? profileRef.current : null,
    };
    setStage("calibrating");
    setNotice("Stand comfortably and still for 1.5 seconds.");
  }
  function onReady(c: {
    width: number;
    height: number;
    facing: "environment" | "user";
    engine: string;
  }) {
    meta.current = { ...c, side, mirrored: false };
    setCameraReady(true);
    setStage("positioning");
    setNotice(
      "Camera ready. Verify your visible side and confirm the side view.",
    );
  }
  function onFrame(
    joints: Joint[],
    time: number,
    width: number,
    height: number,
  ) {
    clock.current = time;
    poseTimes.current.push(time);
    poseTimes.current = poseTimes.current.filter((t) => time - t <= 3000);
    const capture = meta.current;
    if (!capture) return;
    if (width !== capture.width || height !== capture.height) {
      cal.current = null;
      profileRef.current = null;
      setProfile(null);
      if (recording.current) void finish("interrupted");
      else {
        cameraControl.current?.stop();
        meta.current = null;
        setCameraReady(false);
        setStage("positioning");
        setNotice(
          "Camera dimensions changed. Restart and recalibrate for this orientation.",
        );
      }
      return;
    }
    capture.side = side;
    const m = measure(joints, side, width, height),
      c = cal.current;
    if (c) {
      const x = c.signal.next(m.knee, time);
      if (x === null) {
        c.start = null;
        c.values = [];
        c.returnSince = null;
        if (c.baseline !== null) {
          c.baseline = null;
          c.peak = 0;
        }
        setNotice(
          "Tracking lost. Keep the selected hip, knee and ankle visible, then stand still again.",
        );
      } else if (c.baseline === null) {
        c.start ??= time;
        c.values.push(x);
        if (c.values.length > 60) c.values.shift();
        if (time - c.start >= 1500 && c.values.length >= 6) {
          const baseline = median(c.values)!;
          const noise = mad(c.values)!;
          if (noise > 5) {
            c.start = null;
            c.values = [];
            setNotice(
              "Standing signal is noisy. Improve lighting and keep the camera stable.",
            );
          } else if (c.reuse) {
            const fingerprint = `${width}x${height}:${capture.facing}:${side}`;
            if (
              c.reuse.fingerprint !== fingerprint ||
              Math.abs(baseline - c.reuse.baseline) >
                Math.max(10, c.reuse.noise * 3)
            ) {
              cal.current = null;
              setStage("positioning");
              setNotice(
                "Setup differs from the previous set. Recalibrate; direct comparison will be unavailable.",
              );
            } else {
              profileRef.current = c.reuse;
              setProfile(c.reuse);
              cal.current = null;
              setStage("ready");
              setNotice(
                "Standing setup rechecked. Start your next set without moving the camera.",
              );
            }
          } else {
            c.baseline = baseline;
            c.peak = baseline;
            setNotice(
              "Now perform one comfortable setup squat and return to standing. It will not count toward your set.",
            );
          }
        }
      } else {
        c.peak = Math.max(c.peak, x);
        if (c.peak - c.baseline >= 20 && x <= c.baseline + 5) {
          c.returnSince ??= time;
          if (time - c.returnSince >= 250) {
            const p = makeProfile(
              c.baseline,
              c.peak,
              side,
              `${width}x${height}:${capture.facing}:${side}`,
              mad(c.values) ?? 0,
            );
            profileRef.current = p;
            setProfile(p);
            cal.current = null;
            setStage("ready");
            setNotice(
              "Setup complete. Stand comfortably, then start your set.",
            );
          }
        } else c.returnSince = null;
      }
    }
    const r = recording.current;
    if (r) {
      const t = time - r.start;
      if (
        t >= 90000 ||
        r.samples.length >= MAX_SAMPLES ||
        r.detector.reps.length >= 10
      ) {
        void finish();
        return;
      }
      if (t - r.last >= 50) {
        r.last = t;
        const sample = prepareSample(joints, r.capture, t, r.signal);
        r.samples.push(sample);
        const rep = r.detector.push(sample);
        if (rep) setNotice(`Rep ${rep.id} completed.`);
        if (t - r.checkpointAt >= 2000) {
          r.checkpointAt = t;
          const snapshot = {
            id: r.id,
            createdAt: r.createdAt,
            profile: r.profile,
            capture: r.capture,
            samples: [...r.samples],
          };
          r.queue = r.queue
            .then(() => checkpoint(snapshot))
            .catch((e) => {
              r.storageError = e.message;
              setNotice(
                `Draft checkpoint unavailable: ${e.message}. Keep this page open and export if saving fails.`,
              );
            });
        }
      }
    }
    if (time - lastUI.current >= 200) {
      lastUI.current = time;
      const times = poseTimes.current;
      const poseRate =
        times.length > 1
          ? ((times.length - 1) * 1000) / (times[times.length - 1] - times[0])
          : 0;
      setTelemetry({
        knee: m.knee,
        hip: m.hip,
        count: r?.detector.reps.length ?? 0,
        seconds: r ? (time - r.start) / 1000 : 0,
        phase: r
          ? r.detector.phase[0].toUpperCase() + r.detector.phase.slice(1)
          : stage === "calibrating"
            ? "Setup"
            : "Waiting",
        poseRate,
        tracking:
          m.knee === null
            ? "Pose lost"
            : poseRate > 0 && poseRate < 6
              ? "Tracking · low rate"
              : "Tracking",
      });
    }
  }
  function startSet() {
    if (recording.current) return;
    const p = profileRef.current,
      capture = meta.current;
    if (
      !p ||
      !capture ||
      stage !== "ready" ||
      !confirmed ||
      performance.now() - clock.current > MAX_VALID_SAMPLE_INTERVAL_MS ||
      telemetry.knee === null ||
      telemetry.knee > p.stand
    ) {
      setNotice("Stand still in view before starting your set.");
      return;
    }
    recording.current = {
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      start: clock.current,
      last: -Infinity,
      samples: [],
      signal: new Signal(),
      detector: new SquatDetector(p),
      profile: p,
      capture: { ...capture },
      checkpointAt: 0,
      queue: Promise.resolve(),
      storageError: null,
    };
    setResult(null);
    setSaved(false);
    setStage("recording");
    setNotice(
      "Recording landmarks locally. Complete your comfortable down-and-up cycles.",
    );
  }
  const s = result ? summary(result.reps) : null;
  return (
    <>
      <section className="panel" aria-labelledby="calibration-title">
        <h2 id="calibration-title">Your setup, your range</h2>
        <label>
          Visible body side
          <select
            value={side}
            disabled={stage === "calibrating" || stage === "recording"}
            onChange={(e) => {
              setSide(e.target.value as Side);
              profileRef.current = null;
              setProfile(null);
              setStage("positioning");
            }}
          >
            <option value="left">Anatomical left</option>
            <option value="right">Anatomical right</option>
          </select>
        </label>
        <label className="check">
          <input
            type="checkbox"
            checked={confirmed}
            disabled={stage === "recording"}
            onChange={(e) => setConfirmed(e.target.checked)}
          />
          I am side-on, my full body is visible, and the camera is stable.
        </label>
        <div className="actions">
          <button
            className="secondary-button"
            disabled={
              !confirmed ||
              !cameraReady ||
              stage === "recording" ||
              stage === "calibrating"
            }
            onClick={() => beginCalibration(false)}
          >
            Calibrate comfortable range
          </button>
          {profile ? (
            <button
              className="secondary-button"
              disabled={
                !confirmed ||
                !cameraReady ||
                stage === "recording" ||
                stage === "calibrating"
              }
              onClick={() => beginCalibration(true)}
            >
              Recheck previous setup
            </button>
          ) : null}
          <button
            className="button"
            disabled={stage !== "ready" || !confirmed}
            onClick={startSet}
          >
            Start set
          </button>
          <button
            className="secondary-button"
            disabled={stage !== "recording"}
            onClick={() => void finish()}
          >
            Finish set
          </button>
        </div>
        <p role="status" aria-live="polite">
          {notice}
        </p>
        <dl className="metric-grid">
          <div>
            <dt>Completed reps</dt>
            <dd>{telemetry.count}</dd>
          </div>
          <div>
            <dt>Estimated knee flexion</dt>
            <dd>
              {telemetry.knee === null
                ? "Unavailable"
                : `${Math.round(telemetry.knee)}°`}
            </dd>
          </div>
          <div>
            <dt>Estimated hip flexion</dt>
            <dd>
              {telemetry.hip === null
                ? "Unavailable"
                : `${Math.round(telemetry.hip)}°`}
            </dd>
          </div>
          <div>
            <dt>Set elapsed</dt>
            <dd>{telemetry.seconds.toFixed(1)} s</dd>
          </div>
          <div>
            <dt>Movement phase</dt>
            <dd>{telemetry.phase}</dd>
          </div>
          <div>
            <dt>Processed pose rate</dt>
            <dd>{telemetry.poseRate ? `${telemetry.poseRate.toFixed(1)} fps` : "—"}</dd>
          </div>
          <div>
            <dt>Tracking state</dt>
            <dd>{telemetry.tracking}</dd>
          </div>
        </dl>
        <p className="status">
          Ten completed reps or 90 seconds maximum. A low pose rate remains
          valid when each processed sample contains the selected leg. Lost-pose
          samples invalidate incomplete movement. Stop camera ends a set as
          interrupted.
        </p>
      </section>
      <PoseSpike
        onFrame={onFrame}
        onReady={onReady}
        onStopped={onStopped}
        ref={cameraControl}
      />
      {result && s ? (
        <section className="panel">
          <h2>Set results</h2>
          <p>
            {s.count} completed reps · {result.status} ·{" "}
            {saved ? "Saved on this device" : "Not saved"}
          </p>
          {!s.count ? (
            <p>
              No completed reps. Partial movement and unreliable tracking are
              excluded.
            </p>
          ) : (
            <p>
              Median estimated knee bend {s.peak?.toFixed(0)}° · Median ascent{" "}
              {((s.ascent ?? 0) / 1000).toFixed(1)} s
            </p>
          )}
          <p>
            Tracking available during{" "}
            {(result.summary.trackingCoverage * 100).toFixed(0)}% of recorded
            time.
          </p>
          <div className="actions">
            {saved ? (
              <>
                <a className="button" href={`/replay?id=${result.id}`}>
                  Replay set
                </a>
                <a
                  className="secondary-button"
                  href={`/session?profile=${result.profile.id}`}
                >
                  Record another set
                </a>
              </>
            ) : (
              <button
                className="secondary-button"
                onClick={() =>
                  void saveSession(result)
                    .then(() => {
                      setSaved(true);
                      setNotice("Set saved on this device.");
                    })
                    .catch((e) => setNotice(e.message))
                }
              >
                Retry saving
              </button>
            )}
            <button
              className="secondary-button"
              onClick={() => download(result)}
            >
              Export session
            </button>
            <a className="secondary-button" href="/history">
              History
            </a>
          </div>
        </section>
      ) : null}
    </>
  );
}
