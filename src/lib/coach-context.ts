import type { Session } from "./motion/schema";
import { summary } from "./motion/analysis";
import { postureFeedback } from "./motion/posture";
import type { HelpSet } from "./gemini-help";
export function coachContext(session: Session): HelpSet {
  const stats = summary(session.reps);
  return {
    completedReps: stats.count,
    trackingCoverage: session.summary.trackingCoverage,
    medianKneeBend: stats.peak,
    medianAscentMs: stats.ascent,
    posture: postureFeedback(session).reps.map((r) => ({ bend: r.checks[0].state, heels: r.checks[1].state, standing: r.checks[2].state })),
  };
}
