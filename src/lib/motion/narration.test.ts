import { expect, it } from "vitest";
import { CUES, CueGate, framingCue, noticeCue } from "./narration";
import { syntheticJoints } from "./fixtures";
it("gives evidence-based framing cues and avoids straightening cues during a squat", () => {
  const joints = syntheticJoints(0);
  expect(framingCue(joints, "left", 640, 480, false)).toBe("framed");
  joints[27].visibility = 0;
  expect(framingCue(joints, "left", 640, 480, true)).toBe("missing");
  joints[27].visibility = 1;
  joints[31].y = 0.98;
  expect(framingCue(joints, "left", 640, 480, true)).toBe("back");
  expect(framingCue(syntheticJoints(40), "left", 640, 480, true)).toBe("upright");
  expect(framingCue(syntheticJoints(40), "left", 640, 480, false)).toBe("framed");
  const small = syntheticJoints(0).map(j => ({ ...j, y: 0.5 + (j.y - 0.5) * 0.2 }));
  expect(framingCue(small, "right", 640, 480, false)).toBe("closer");
});
it("waits for stable cues, applies cooldown, and permits immediate stage changes", () => {
  const gate = new CueGate();
  expect(gate.next("missing", 0)).toBe(false);
  expect(gate.next("back", 1000)).toBe(false);
  expect(gate.next("back", 2200)).toBe(true);
  expect(gate.next("back", 3000)).toBe(false);
  expect(gate.next("closer", 4000)).toBe(false);
  expect(gate.next("closer", 5300)).toBe(false);
  expect(gate.next("recording", 5400, true)).toBe(true);
  expect(gate.next("recording", 5500, true)).toBe(false);
});
it("maps bounded rep announcements and every calibration transition", () => {
  expect(noticeCue("Rep 10 completed.")).toBe("rep10");
  expect(noticeCue("Rep 11 completed.")).toBe(null);
  expect(noticeCue("Now perform one comfortable setup squat")).toBe("squat");
  expect(noticeCue("Calibration complete. Your set is starting")).toBe("starting");
  expect(noticeCue("Calibration complete. Set started")).toBe("recording");
  expect(noticeCue("Untrusted arbitrary text")).toBe(null);
  expect(Object.keys(CUES)).toHaveLength(30);
});
