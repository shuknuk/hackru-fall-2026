import type { Rep, Sample, Session } from "./schema";
import { jointVisible } from "../pose/types";
import { median, MAX_VALID_SAMPLE_INTERVAL_MS } from "./analysis";

export type PostureCheck = { name: string; state: "pass" | "review" | "unknown"; detail: string; cue: string };
export type RepPosture = { id: number; knee: number | null; hip: number | null; checks: PostureCheck[] };
// Starting UI heuristics, not validated clinical cutoffs or ideal joint angles.
const MIN_HIP_CHANGE = 15;
const RETURN_HIP_TOLERANCE = 15;
const HEEL_SLOPE_CHANGE = 0.2;
function hipValue(samples: Sample[]) {
  const values = samples.filter((s) => s.valid && s.hip !== null).map((s) => s.hip!);
  return values.length >= 3 ? median(values) : null;
}
function heelSlope(samples: Sample[], session: Session) {
  const heel = session.capture.side === "left" ? 18 : 19;
  const toe = heel + 2;
  const values = samples.flatMap((s) => {
    const h = s.joints[heel], t = s.joints[toe];
    if (!s.valid || !jointVisible(h) || !jointVisible(t)) return [];
    const dx = (t.x - h.x) * session.capture.width;
    const dy = (t.y - h.y) * session.capture.height;
    const length = Math.hypot(dx, dy);
    return length >= 10 ? [dy / length] : [];
  });
  return values.length >= 3 ? median(values) : null;
}
function trackedWindow(samples: Sample[]) {
  return samples.length >= 3 && samples.every((s, i) => s.valid && (!i || s.t - samples[i - 1].t <= MAX_VALID_SAMPLE_INTERVAL_MS));
}
export function postureFeedback(session: Session) {
  const standing = session.samples.filter((s) => s.t <= session.samples[0].t + 1500 && s.valid && s.filtered !== null && s.filtered <= session.profile.stand);
  const baselineHip = hipValue(standing);
  const baselineHeel = heelSlope(standing, session);
  const reps: RepPosture[] = session.reps.map((rep: Rep) => {
    const bottom = session.samples.filter((s) => Math.abs(s.t - rep.bottom) <= 150 && s.t >= rep.start && s.t <= rep.end);
    const finish = session.samples.filter((s) => s.t <= rep.end && s.t >= rep.end - 200);
    const hip = trackedWindow(bottom) ? hipValue(bottom) : null;
    const endHip = trackedWindow(finish) ? hipValue(finish) : null;
    const heel = trackedWindow(bottom) ? heelSlope(bottom, session) : null;
    const clear = rep.coverage >= 0.9;
    const bends = clear && hip !== null && baselineHip !== null && rep.peak !== null;
    const returns = clear && endHip !== null && baselineHip !== null;
    const feet = clear && baselineHeel !== null && heel !== null;
    return {
      id: rep.id, knee: rep.peak, hip,
      checks: [
        { name: "Hips and knees bend", state: !bends ? "unknown" : hip! - baselineHip! >= MIN_HIP_CHANGE && rep.peak! - session.profile.baseline >= 15 ? "pass" : "review", detail: !bends ? "We could not clearly see your shoulders, hips and knees throughout this squat." : hip! - baselineHip! >= MIN_HIP_CHANGE && rep.peak! - session.profile.baseline >= 15 ? "You bent both your hips and knees as you lowered." : "We could not see both your hips and knees bending enough as you lowered.", cue: "Lower by bending both hips and knees within your comfortable range." },
        { name: "Heels stay level", state: !feet ? "unknown" : heel! - baselineHeel! > HEEL_SLOPE_CHANGE ? "review" : "pass", detail: !feet ? "We could not see your heels and toes clearly enough to check this." : heel! - baselineHeel! > HEEL_SLOPE_CHANGE ? "Your heels may have lifted as you lowered." : "Your heels appeared to stay on the floor as you lowered.", cue: "Keep your whole foot, including the heel, grounded as you lower and stand." },
        { name: "Return to standing", state: !returns ? "unknown" : endHip! <= baselineHip! + RETURN_HIP_TOLERANCE ? "pass" : "review", detail: !returns ? "We could not see clearly whether you stood all the way back up." : endHip! <= baselineHip! + RETURN_HIP_TOLERANCE ? "You returned to your usual standing position." : "You appeared to stay bent forward at the end of this squat.", cue: "Finish by returning your hips and knees to your comfortable standing position." },
      ],
    };
  });
  const checks = reps.flatMap((rep) => rep.checks);
  const review = checks.some((check) => check.state === "review");
  const unknown = !checks.length || checks.some((check) => check.state === "unknown");
  return { reps, state: review ? "review" as const : unknown ? "unknown" as const : "pass" as const };
}
