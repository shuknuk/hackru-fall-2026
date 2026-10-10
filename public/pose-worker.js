/* global Vision, importScripts */
// Classic worker intentionally keeps the SDK's importScripts loader outside the Next.js module transform.
let task = null;
self.onmessage = async event => {
  const message = event.data;
  if (message.type === "init") {
    try {
      importScripts("/mediapipe/tasks-vision-1.1.0/vision_bundle.js");
      const wasm = await Vision.FilesetResolver.forVisionTasks(`${self.location.origin}/mediapipe/tasks-vision-1.1.0/wasm`);
      task = await Vision.PoseLandmarker.createFromOptions(wasm, {
        baseOptions: { modelAssetPath: `${self.location.origin}/mediapipe/models/pose-landmarker-lite-v1.task`, delegate: "CPU" },
        canvas: new OffscreenCanvas(640, 480), runningMode: "VIDEO", numPoses: 1,
        minPoseDetectionConfidence: 0.5, minPosePresenceConfidence: 0.5, minTrackingConfidence: 0.5,
        outputSegmentationMasks: false,
      });
      self.postMessage({ type: "ready" });
    } catch (error) { self.postMessage({ type: "error", message: error instanceof Error ? error.message : "Worker initialization failed" }); }
  } else if (message.type === "frame") {
    const bitmap = message.bitmap;
    try {
      if (!task) throw new Error("Pose task is not initialized");
      const start = performance.now();
      const result = task.detectForVideo(bitmap, message.timestamp);
      const joints = (result.landmarks[0] ?? []).map(point => ({ x: point.x, y: point.y, z: point.z,
        visibility: Number.isFinite(point.visibility) ? point.visibility : null,
        presence: Number.isFinite(point.presence) ? point.presence : null }));
      self.postMessage({ type: "result", joints, inferenceMs: performance.now() - start });
    } catch (error) { self.postMessage({ type: "error", message: error instanceof Error ? error.message : "Worker inference failed" }); }
    finally { bitmap.close(); }
  }
};
