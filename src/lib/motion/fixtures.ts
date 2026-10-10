// Authored analytical sequences, not recorded people or evidence of live-model accuracy.
import type { Joint } from "../pose/types";
import { makeProfile, Signal } from "./analysis";
import { buildSession, prepareSample } from "./session";
import type { Capture, Profile, Sample } from "./schema";
export function syntheticJoints(flex: number, lean = 15): Joint[] {
  const a = (flex * Math.PI) / 180,
    l = (lean * Math.PI) / 180,
    w = 640,
    h = 480;
  const joints: Joint[] = Array.from({ length: 33 }, () => ({
    x: 0.5,
    y: 0.5,
    z: 0,
    visibility: 0.99,
    presence: 0.99,
  }));
  for (const offset of [0, 1]) {
    const x = 0.45 + offset * 0.055;
    joints[23 + offset] = { ...joints[23 + offset], x, y: 0.48 };
    joints[25 + offset] = { ...joints[25 + offset], x, y: 0.68 };
    joints[27 + offset] = {
      ...joints[27 + offset],
      x: x + (Math.sin(a) * 0.2 * h) / w,
      y: 0.68 + Math.cos(a) * 0.2,
    };
    joints[11 + offset] = {
      ...joints[11 + offset],
      x: x - (Math.sin(l) * 0.22 * h) / w,
      y: 0.48 - Math.cos(l) * 0.22,
    };
    joints[13 + offset] = { ...joints[13 + offset], x: x - 0.09, y: 0.44 };
    joints[15 + offset] = { ...joints[15 + offset], x: x - 0.13, y: 0.56 };
    joints[29 + offset] = {
      ...joints[27 + offset],
      x: joints[27 + offset].x - 0.02,
    };
    joints[31 + offset] = {
      ...joints[27 + offset],
      x: joints[27 + offset].x + 0.08,
    };
  }
  return joints;
}
export const SAMPLE_CAPTURE: Capture = {
  width: 640,
  height: 480,
  facing: "environment",
  mirrored: false,
  side: "left",
  engine: "Authored synthetic fixture",
};
export function fixtureSamples(
  peaks = [65, 65, 65],
  down = 1000,
  up = 1000,
): Sample[] {
  const values: number[] = [];
  const hold = (x: number, ms: number) => {
    for (let t = 0; t < ms; t += 50) values.push(x);
  };
  hold(0, 700);
  for (const peak of peaks) {
    for (let t = 50; t <= down; t += 50) values.push((peak * t) / down);
    for (let t = 50; t <= up; t += 50) values.push(peak * (1 - t / up));
    hold(0, 650);
  }
  const signal = new Signal();
  return values.map((x, i) =>
    prepareSample(syntheticJoints(x), SAMPLE_CAPTURE, i * 50, signal),
  );
}
export function samplePair() {
  const profile: Profile = makeProfile(0, 65, "left", "synthetic-640x480-side");
  return [
    buildSession(
      fixtureSamples(),
      profile,
      SAMPLE_CAPTURE,
      "complete",
      "sample-synthetic",
    ),
    buildSession(
      fixtureSamples([75, 73, 76], 1300, 900),
      profile,
      SAMPLE_CAPTURE,
      "complete",
      "sample-synthetic",
    ),
  ];
}
