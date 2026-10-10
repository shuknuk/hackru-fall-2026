"use client";

import {
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
  type Ref,
} from "react";
import { acquireCamera, waitForVideo } from "@/lib/pose/camera";
import {
  jointVisible,
  type EngineChoice,
  type PoseEngine,
  type Joint,
} from "@/lib/pose/types";

type State = "idle" | "requesting" | "loading" | "live" | "error";
interface Capture {
  abort: AbortController;
  stream?: MediaStream;
  engine?: PoseEngine;
  frame?: number;
  videoFrame?: boolean;
  staleTimer?: ReturnType<typeof setTimeout>;
}
interface Diagnostics {
  engine: string;
  frames: number;
  fps: number;
  p50: number;
  p95: number;
  width: number;
  height: number;
  joints: number;
  presence: boolean;
}
const CONNECTIONS = [
  [11, 12],
  [11, 13],
  [13, 15],
  [12, 14],
  [14, 16],
  [11, 23],
  [12, 24],
  [23, 24],
  [23, 25],
  [25, 27],
  [27, 29],
  [29, 31],
  [27, 31],
  [24, 26],
  [26, 28],
  [28, 30],
  [30, 32],
  [28, 32],
];

function draw(
  canvas: HTMLCanvasElement,
  video: HTMLVideoElement,
  joints: Joint[],
) {
  if (canvas.width !== video.videoWidth) canvas.width = video.videoWidth;
  if (canvas.height !== video.videoHeight) canvas.height = video.videoHeight;
  const context = canvas.getContext("2d");
  if (!context) return;
  context.clearRect(0, 0, canvas.width, canvas.height);
  context.strokeStyle = "#d7f2a3";
  context.fillStyle = "#f8ffed";
  context.lineWidth = 3;
  for (const [a, b] of CONNECTIONS) {
    const start = joints[a],
      end = joints[b];
    if (!jointVisible(start) || !jointVisible(end)) continue;
    context.beginPath();
    context.moveTo(start.x * canvas.width, start.y * canvas.height);
    context.lineTo(end.x * canvas.width, end.y * canvas.height);
    context.stroke();
  }
  for (const joint of joints.slice(11))
    if (jointVisible(joint)) {
      context.beginPath();
      context.arc(
        joint.x * canvas.width,
        joint.y * canvas.height,
        4,
        0,
        Math.PI * 2,
      );
      context.fill();
    }
}

interface Props {
  onFrame?: (
    joints: Joint[],
    time: number,
    width: number,
    height: number,
  ) => void;
  onReady?: (capture: {
    width: number;
    height: number;
    facing: "environment" | "user";
    engine: string;
  }) => void;
  onStopped?: (reason: string) => void;
  ref?: Ref<{ stop: () => void }>;
}
export default function PoseSpike({ onFrame, onReady, onStopped, ref }: Props) {
  const callbacks = useRef({ onFrame, onReady, onStopped });
  useEffect(() => {
    callbacks.current = { onFrame, onReady, onStopped };
  }, [onFrame, onReady, onStopped]);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const captureRef = useRef<Capture | null>(null);
  const [state, setState] = useState<State>("idle");
  const [message, setMessage] = useState(
    "Camera is off. Start when your space is ready.",
  );
  const [facing, setFacing] = useState<"environment" | "user">("environment");
  const [choice, setChoice] = useState<EngineChoice>("worker-cpu");
  const [diagnostics, setDiagnostics] = useState<Diagnostics | null>(null);

  const dispose = useCallback(() => {
    const capture = captureRef.current;
    captureRef.current = null;
    if (capture) {
      capture.abort.abort();
      if (capture.frame !== undefined) {
        if (capture.videoFrame)
          videoRef.current?.cancelVideoFrameCallback(capture.frame);
        else cancelAnimationFrame(capture.frame);
      }
      clearTimeout(capture.staleTimer);
      capture.stream?.getTracks().forEach((track) => track.stop());
      capture.engine?.close();
    }
    const video = videoRef.current;
    if (video) {
      video.pause();
      video.srcObject = null;
    }
    const canvas = canvasRef.current;
    canvas?.getContext("2d")?.clearRect(0, 0, canvas.width, canvas.height);
  }, []);

  function stop(reason = "Camera stopped. Start again when you’re ready.") {
    dispose();
    setState("idle");
    setMessage(reason);
    callbacks.current.onStopped?.(reason);
  }

  useImperativeHandle(
    ref,
    () => ({
      stop() {
        dispose();
        setState("idle");
        setMessage("Camera stopped. Your set has ended.");
      },
    }),
    [dispose],
  );
  useEffect(() => {
    const hidden = () => {
      if (document.hidden) {
        callbacks.current.onStopped?.("Page hidden");
        dispose();
        setState("idle");
        setMessage(
          "Camera stopped while the page was hidden. Start again to resume.",
        );
      }
    };
    document.addEventListener("visibilitychange", hidden);
    return () => {
      document.removeEventListener("visibilitychange", hidden);
      dispose();
    };
  }, [dispose]);

  async function start() {
    if (captureRef.current) return;
    const video = videoRef.current,
      canvas = canvasRef.current;
    if (!video || !canvas) return;
    if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
      setState("error");
      setMessage(
        "Camera access requires HTTPS and a browser with camera support.",
      );
      return;
    }
    const capture: Capture = { abort: new AbortController() };
    captureRef.current = capture;
    const active = () =>
      captureRef.current === capture && !capture.abort.signal.aborted;
    setDiagnostics(null);
    setState("requesting");
    setMessage("Waiting for camera permission…");
    try {
      const stream = await acquireCamera(
        navigator.mediaDevices,
        facing,
        capture.abort.signal,
      );
      if (!active()) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }
      capture.stream = stream;
      video.srcObject = stream;
      stream.getVideoTracks()[0]?.addEventListener(
        "ended",
        () => {
          if (active()) {
            callbacks.current.onStopped?.("Camera disconnected");
            dispose();
            setState("error");
            setMessage(
              "The camera was disconnected. Check it and start again.",
            );
          }
        },
        { once: true },
      );
      await waitForVideo(video, capture.abort.signal);
      if (!active()) return;
      setState("loading");
      setMessage("Loading the local pose model…");
      const { createPoseEngine } = await import("@/lib/pose/engine");
      if (!active()) return;
      const engine = await createPoseEngine(choice, capture.abort.signal);
      if (!active()) {
        engine.close();
        return;
      }
      capture.engine = engine;
      callbacks.current.onReady?.({
        width: video.videoWidth,
        height: video.videoHeight,
        facing,
        engine: engine.label,
      });
      setState("live");
      setMessage("Camera is live. Keep your full body in view.");
      let lastMediaTime = -1,
        lastInference = -Infinity,
        frames = 0,
        lastUpdate = -Infinity;
      const startedAt = performance.now(),
        latencies: number[] = [];
      function schedule() {
        if (!active()) return;
        capture.videoFrame =
          typeof video!.requestVideoFrameCallback === "function";
        capture.frame = capture.videoFrame
          ? video!.requestVideoFrameCallback(tick)
          : requestAnimationFrame(tick);
      }
      async function tick() {
        if (!active()) return;
        const now = performance.now();
        if (
          video!.readyState < 2 ||
          video!.currentTime === lastMediaTime ||
          now - lastInference < 50
        ) {
          schedule();
          return;
        }
        lastMediaTime = video!.currentTime;
        lastInference = now;
        try {
          const result = await engine.infer(video!, now);
          if (!active()) return;
          if (result.joints.length !== 0 && result.joints.length !== 33)
            throw new Error("Unexpected pose landmark count");
          callbacks.current.onFrame?.(
            result.joints,
            now,
            video!.videoWidth,
            video!.videoHeight,
          );
          draw(canvas!, video!, result.joints);
          clearTimeout(capture.staleTimer);
          capture.staleTimer = setTimeout(() => {
            if (active())
              canvas!
                .getContext("2d")
                ?.clearRect(0, 0, canvas!.width, canvas!.height);
          }, 600);
          frames++;
          latencies.push(result.inferenceMs);
          if (latencies.length > 180) latencies.shift();
          const finishedAt = performance.now();
          if (finishedAt - lastUpdate >= 500) {
            lastUpdate = finishedAt;
            const sorted = [...latencies].sort((a, b) => a - b);
            setDiagnostics({
              engine: engine.label,
              frames,
              fps: (frames * 1000) / Math.max(1, finishedAt - startedAt),
              p50: sorted[Math.floor((sorted.length - 1) * 0.5)],
              p95: sorted[Math.floor((sorted.length - 1) * 0.95)],
              width: video!.videoWidth,
              height: video!.videoHeight,
              joints: result.joints.length,
              presence: result.joints.some((joint) => joint.presence !== null),
            });
            setMessage(
              result.joints.length
                ? "Pose detected. Adjust your position so the overlay follows your body."
                : "No pose detected. Step back so your full body is in view.",
            );
          }
          schedule();
        } catch (error) {
          if (!active()) return;
          callbacks.current.onStopped?.("Tracking error");
          dispose();
          setState("error");
          setMessage(
            `Tracking stopped: ${error instanceof Error ? error.message : "Inference failed"}. Try another engine in development diagnostics.`,
          );
        }
      }
      schedule();
    } catch (error) {
      if (!active()) return;
      dispose();
      setState("error");
      const name = error instanceof DOMException ? error.name : "";
      setMessage(
        name === "NotAllowedError"
          ? "Camera permission was denied. Allow it in browser settings, then start again."
          : name === "NotFoundError"
            ? "No camera was found. Connect a camera and try again."
            : `Could not start tracking: ${error instanceof Error ? error.message : "Unknown camera or model error"}.`,
      );
    }
  }

  const busy =
    state === "requesting" || state === "loading" || state === "live";
  return (
    <section className="pose-spike" aria-labelledby="camera-title">
      <h2 id="camera-title">Live pose preview</h2>
      <p>
        Video stays in this page. Only body landmarks and movement estimates are
        saved when you record a set.
      </p>
      <div className="camera-controls">
        <label>
          Camera
          <select
            value={facing}
            disabled={busy}
            onChange={(event) => setFacing(event.target.value as typeof facing)}
          >
            <option value="environment">Rear camera preferred</option>
            <option value="user">Front camera preferred</option>
          </select>
        </label>
        <button className="button" disabled={busy} onClick={start}>
          Start camera
        </button>
        <button
          className="secondary-button"
          disabled={!busy}
          onClick={() => stop()}
        >
          Stop camera
        </button>
      </div>
      <p className="camera-status" role="status" aria-live="polite">
        {message}
      </p>
      <div
        className="camera-view"
        data-state={state}
        style={
          diagnostics
            ? { aspectRatio: `${diagnostics.width} / ${diagnostics.height}` }
            : undefined
        }
      >
        <video
          ref={videoRef}
          muted
          playsInline
          autoPlay
          aria-label="Live camera preview"
        />
        <canvas ref={canvasRef} aria-hidden="true" />
        {!busy ? (
          <span className="camera-placeholder">Your camera is off</span>
        ) : null}
      </div>
      <details className="diagnostics">
        <summary>Development diagnostics</summary>
        <label>
          Pose engine
          <select
            value={choice}
            disabled={busy}
            onChange={(event) => setChoice(event.target.value as EngineChoice)}
          >
            <option value="worker-cpu">Worker / CPU</option>
            <option value="main-cpu">Main thread / CPU</option>
            <option value="main-gpu">Main thread / GPU</option>
          </select>
        </label>
        <p>
          Stop before changing engine or camera. Main-thread inference can pause
          the interface. Physical iPhone compatibility is still being tested.
        </p>
        {diagnostics ? (
          <dl>
            <div>
              <dt>Engine</dt>
              <dd>{diagnostics.engine}</dd>
            </div>
            <div>
              <dt>Input</dt>
              <dd>
                {diagnostics.width} × {diagnostics.height}
              </dd>
            </div>
            <div>
              <dt>Processed frames</dt>
              <dd>{diagnostics.frames}</dd>
            </div>
            <div>
              <dt>Average processed FPS</dt>
              <dd>{diagnostics.fps.toFixed(1)}</dd>
            </div>
            <div>
              <dt>Inference p50 / p95</dt>
              <dd>
                {diagnostics.p50.toFixed(1)} / {diagnostics.p95.toFixed(1)} ms
              </dd>
            </div>
            <div>
              <dt>Landmarks in latest sample</dt>
              <dd>{diagnostics.joints}</dd>
            </div>
            <div>
              <dt>Presence field observed</dt>
              <dd>{diagnostics.presence ? "Yes" : "No"}</dd>
            </div>
          </dl>
        ) : (
          <p>No measurements yet.</p>
        )}
        <p>
          SDK 1.1.0 · Lite model v1 · One inference frame in flight · At most 20
          processed frames/s.
        </p>
      </details>
    </section>
  );
}
