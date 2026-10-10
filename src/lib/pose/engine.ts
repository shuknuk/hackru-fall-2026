import { z } from "zod";
import { jointSchema } from "../motion/schema";
import {
  MODEL_PATH,
  WASM_PATH,
  type Delegate,
  type EngineChoice,
  type Joint,
  type PoseEngine,
  type PoseFrame,
} from "./types";

export function normalizeJoints(
  points: {
    x: number;
    y: number;
    z: number;
    visibility?: number;
    presence?: number;
  }[],
): Joint[] {
  return points.map((point) => ({
    x: point.x,
    y: point.y,
    z: point.z,
    visibility: Number.isFinite(point.visibility) ? point.visibility! : null,
    presence: Number.isFinite(point.presence) ? point.presence! : null,
  }));
}

async function createMainEngine(delegate: Delegate): Promise<PoseEngine> {
  const { FilesetResolver, PoseLandmarker } = await import(
    "@mediapipe/tasks-vision"
  );
  const files = await FilesetResolver.forVisionTasks(WASM_PATH);
  const task = await PoseLandmarker.createFromOptions(files, {
    baseOptions: { modelAssetPath: MODEL_PATH, delegate },
    runningMode: "VIDEO",
    numPoses: 1,
    minPoseDetectionConfidence: 0.5,
    minPosePresenceConfidence: 0.5,
    minTrackingConfidence: 0.5,
    outputSegmentationMasks: false,
  });
  let closed = false;
  return {
    label: `Main thread / ${delegate}`,
    async infer(video, timestamp) {
      if (closed) throw new Error("Pose engine is closed");
      const start = performance.now();
      const result = task.detectForVideo(video, timestamp);
      return {
        joints: normalizeJoints(result.landmarks[0] ?? []),
        inferenceMs: performance.now() - start,
      };
    },
    close() {
      if (!closed) {
        closed = true;
        task.close();
      }
    },
  };
}

async function createWorkerEngine(signal: AbortSignal): Promise<PoseEngine> {
  if (
    typeof Worker === "undefined" ||
    typeof createImageBitmap !== "function" ||
    typeof OffscreenCanvas === "undefined"
  ) {
    throw new Error("This browser lacks the worker image-transfer APIs");
  }
  const worker = new Worker("/pose-worker.js");
  let closed = false;
  let frameId = 0;
  const generation = crypto.randomUUID();
  const replySchema = z.object({
    type: z.literal("result"),
    generation: z.string(),
    frameId: z.number().int(),
    joints: z.array(jointSchema).length(33).or(z.array(jointSchema).length(0)),
    inferenceMs: z.number().finite().min(0),
  });
  let pending: {
    resolve: (value: PoseFrame) => void;
    reject: (error: Error) => void;
    timer: ReturnType<typeof setTimeout>;
    frameId: number;
  } | null = null;
  function close() {
    if (closed) return;
    closed = true;
    worker.terminate();
    if (pending) {
      clearTimeout(pending.timer);
      pending.reject(new Error("Pose worker stopped"));
      pending = null;
    }
  }
  try {
    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(
        () => finish(new Error("Pose worker initialization timed out")),
        25000,
      );
      const abort = () => finish(new Error("Pose initialization cancelled"));
      function finish(error?: Error) {
        clearTimeout(timeout);
        signal.removeEventListener("abort", abort);
        worker.onmessage = null;
        worker.onerror = null;
        if (error) reject(error);
        else resolve();
      }
      worker.onerror = () => finish(new Error("Pose worker could not load"));
      worker.onmessage = (event) => {
        if (event.data.type === "ready") finish();
        else if (event.data.type === "error")
          finish(new Error(event.data.message));
      };
      signal.addEventListener("abort", abort, { once: true });
      if (signal.aborted) {
        abort();
        return;
      }
      worker.postMessage({ type: "init", generation });
    });
  } catch (error) {
    close();
    throw error;
  }
  worker.onerror = () => {
    if (pending) {
      clearTimeout(pending.timer);
      pending.reject(new Error("Pose worker failed"));
      pending = null;
    }
    close();
  };
  worker.onmessage = (event) => {
    if (
      !pending ||
      event.data.generation !== generation ||
      event.data.frameId !== pending.frameId
    )
      return;
    const request = pending;
    pending = null;
    clearTimeout(request.timer);
    if (event.data.type === "result") {
      const parsed = replySchema.safeParse(event.data);
      if (parsed.success)
        request.resolve({
          joints: parsed.data.joints,
          inferenceMs: parsed.data.inferenceMs,
        });
      else request.reject(new Error("Invalid pose worker reply"));
    } else
      request.reject(
        new Error(event.data.message ?? "Unexpected pose worker response"),
      );
  };
  return {
    label: "Worker / CPU",
    async infer(video, timestamp) {
      if (closed || pending)
        throw new Error("Pose worker unavailable or already busy");
      const bitmap = await createImageBitmap(video);
      if (closed) {
        bitmap.close();
        throw new Error("Pose worker stopped");
      }
      return new Promise<PoseFrame>((resolve, reject) => {
        const timer = setTimeout(() => {
          close();
        }, 8000);
        pending = { resolve, reject, timer, frameId: ++frameId };
        try {
          worker.postMessage(
            { type: "frame", bitmap, timestamp, generation, frameId },
            [bitmap],
          );
        } catch (error) {
          bitmap.close();
          clearTimeout(timer);
          pending = null;
          reject(error);
        }
      });
    },
    close,
  };
}

export async function createPoseEngine(
  choice: EngineChoice,
  signal: AbortSignal,
): Promise<PoseEngine> {
  if (choice === "worker-cpu") return createWorkerEngine(signal);
  const engine = await createMainEngine(choice === "main-gpu" ? "GPU" : "CPU");
  if (signal.aborted) {
    engine.close();
    throw new Error("Pose initialization cancelled");
  }
  return engine;
}
