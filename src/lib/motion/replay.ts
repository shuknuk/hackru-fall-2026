import type { Rep } from "./schema";

// Whole-set playback visits completed squat intervals only; stored data is unchanged.
export function squatReplayTime(reps: Rep[], time: number): number {
  for (const rep of reps) {
    if (time <= rep.end) return Math.max(rep.start, time);
  }
  return reps.at(-1)?.end ?? 0;
}
export function advanceSquatReplay(reps: Rep[], time: number, elapsed: number): number {
  let current = squatReplayTime(reps, time);
  let remaining = Math.max(0, elapsed);
  for (const rep of reps) {
    if (current > rep.end) continue;
    current = Math.max(rep.start, current);
    const available = rep.end - current;
    if (remaining <= available) return current + remaining;
    remaining -= available;
    current = rep.end + Number.EPSILON * Math.max(1, rep.end);
  }
  return reps.at(-1)?.end ?? 0;
}
