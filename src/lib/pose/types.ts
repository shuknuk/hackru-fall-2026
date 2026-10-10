export type Delegate = "CPU" | "GPU";
export type EngineChoice = "worker-cpu" | "main-cpu" | "main-gpu";
export interface Joint {
  x: number;
  y: number;
  z: number;
  visibility: number | null;
  presence: number | null;
}
export interface PoseFrame {
  joints: Joint[];
  inferenceMs: number;
}
export interface PoseEngine {
  label: string;
  infer(video: HTMLVideoElement, timestamp: number): Promise<PoseFrame>;
  close(): void;
}
export const WASM_PATH = "/mediapipe/tasks-vision-1.1.0/wasm";
export const MODEL_PATH = "/mediapipe/models/pose-landmarker-lite-v1.task";

export function jointVisible(joint: Joint | undefined): joint is Joint {
  return Boolean(joint && Number.isFinite(joint.x) && Number.isFinite(joint.y)
    && Number.isFinite(joint.z) && joint.x >= 0 && joint.x <= 1 && joint.y >= 0 && joint.y <= 1
    && joint.visibility !== null && joint.visibility >= 0.6
    && (joint.presence === null || joint.presence >= 0.6));
}
