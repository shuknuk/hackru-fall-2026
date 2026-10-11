import { INDICES, measure } from "./analysis";
import { jointVisible, type Joint } from "../pose/types";
import type { Side } from "./schema";

export const CUES = {
  welcome: "Voice guidance is on. Start the camera, then turn side-on with your full body in view.",
  camera: "Camera ready. Choose the side facing the camera, and confirm your setup when your full body is visible.",
  missing: "I cannot see your shoulders, hips, knees and feet clearly. Check your lighting and turn side-on to the camera.",
  back: "You are close to the edge of the picture. Move a little farther from the camera so your shoulders and feet fit in view.",
  closer: "You look small in the picture. Move a little closer, keeping your shoulders and feet in view.",
  upright: "Stand comfortably upright and gently straighten your legs. Do not lock your knees.",
  framed: "Your shoulders, hips, knees and feet are in view. Confirm your side-on setup, then choose calibrate comfortable range.",
  still: "Stand comfortably and hold still for one and a half seconds.",
  squat: "Now do one comfortable setup squat, then stand back up. This squat is for calibration only.",
  starting: "Calibration complete. Your set will start shortly. Stay standing in view until you hear recording started.",
  waiting: "Return to comfortable standing in view. Recording has not started yet.",
  recording: "Recording started. Squat only as low as feels comfortable, then return to standing.",
  lost: "Tracking is unclear. Keep your hips, knees and feet in view, then return to standing to continue. Your completed reps are kept.",
  recovered: "Tracking is back. Complete each squat by returning to standing.",
  ready: "Your previous setup is rechecked. Choose start set when you are ready.",
  noisy: "Keep the camera stable, improve your lighting and hold still so we can finish calibration.",
  stopped: "Camera stopped. Restart the camera and recheck your setup before recording.",
  cancelled: "Start cancelled. Recheck your setup when you are ready.",
  changed: "Your camera setup changed. Restart the camera and calibrate again.",
  finish: "Set finished. Opening results.",
  rep1: "One.", rep2: "Two.", rep3: "Three.", rep4: "Four.", rep5: "Five.",
  rep6: "Six.", rep7: "Seven.", rep8: "Eight.", rep9: "Nine.", rep10: "Ten. Set complete.",
} as const;
export type Cue = keyof typeof CUES;

export function noticeCue(notice: string): Cue | null {
  const rep = /^Rep (\d+) completed\.$/.exec(notice);
  if (rep && Number(rep[1]) >= 1 && Number(rep[1]) <= 10) return `rep${rep[1]}` as Cue;
  if (notice.startsWith("Camera ready")) return "camera";
  if (notice.startsWith("Stand comfortably and still")) return "still";
  if (notice.startsWith("Now perform")) return "squat";
  if (notice.startsWith("Calibration complete. Your set")) return "starting";
  if (notice.startsWith("Calibration complete. Set started")) return "recording";
  if (notice.startsWith("Waiting to start")) return "waiting";
  if (notice.startsWith("Calibration waiting")) return "missing";
  if (notice.startsWith("Keep your")) return "lost";
  if (notice.startsWith("Recording —")) return "recovered";
  if (notice.startsWith("Standing setup rechecked")) return "ready";
  if (notice.startsWith("Standing signal")) return "noisy";
  if (notice.startsWith("Camera stopped") || notice.startsWith("Set interrupted")) return "stopped";
  if (notice.startsWith("Start cancelled")) return "cancelled";
  if (notice.startsWith("Camera dimensions") || notice.startsWith("Setup differs")) return "changed";
  return null;
}

export function framingCue(joints: Joint[], side: Side, width: number, height: number, standing: boolean): Cue {
  const indices = [...INDICES[side], side === "left" ? 29 : 30, side === "left" ? 31 : 32];
  const body = indices.map(i => joints[i]);
  // shortcut: image-space framing thresholds are heuristics; tune after real-phone pilots.
  const reliable = body.filter(jointVisible);
  if (reliable.some(j => j.x < 0.04 || j.x > 0.96 || j.y < 0.04 || j.y > 0.96)) return "back";
  if (reliable.length !== body.length) return "missing";
  const span = Math.max(...reliable.map(j => j.y)) - Math.min(...reliable.map(j => j.y));
  if (span < 0.3) return "closer";
  const knee = measure(joints, side, width, height).knee;
  if (standing && knee !== null && knee > 25) return "upright";
  return standing ? "still" : "framed";
}

export class CueGate {
  private candidate: Cue | null = null;
  private since = 0;
  private last: Cue | null = null;
  private spokenAt = -Infinity;
  next(cue: Cue, now: number, immediate = false): boolean {
    if (cue !== this.candidate) { this.candidate = cue; this.since = now; }
    if (!immediate && now - this.since < 1200) return false;
    if (cue === this.last && (immediate || now - this.spokenAt < 15000)) return false;
    if (!immediate && now - this.spokenAt < 5000) return false;
    this.last = cue; this.spokenAt = now;
    return true;
  }
}
