import { describe, it, expect, vi } from "vitest";
import { acquireCamera } from "./camera";
import { jointVisible } from "./types";
import { normalizeJoints } from "./engine";

describe("camera cancellation", () => {
  it("releases a stream when permission resolves after Stop", async () => {
    let grant!: (stream: MediaStream) => void;
    const stop = vi.fn();
    const stream = { getTracks: () => [{ stop }] } as unknown as MediaStream;
    const controller = new AbortController();
    const getUserMedia = vi.fn<MediaDevices["getUserMedia"]>(() => new Promise<MediaStream>(resolve => { grant = resolve; }));
    const request = acquireCamera({ getUserMedia }, "environment", controller.signal);
    controller.abort(); grant(stream);
    await expect(request).rejects.toMatchObject({ name: "AbortError" });
    expect(stop).toHaveBeenCalledOnce();
    expect(getUserMedia.mock.calls[0][0]).toMatchObject({ audio: false });
  });
});

describe("confidence adapter", () => {
  it("retains optional missing confidence as null, never as a score", () => {
    const [point] = normalizeJoints([{ x: 0.5, y: 0.5, z: 0, visibility: 0.9 }]);
    expect(point.presence).toBeNull();
    expect(jointVisible(point)).toBe(true);
    expect(jointVisible({ ...point, visibility: null })).toBe(false);
    expect(jointVisible({ ...point, presence: 0.2 })).toBe(false);
    expect(jointVisible({ ...point, x: NaN })).toBe(false);
  });
});
