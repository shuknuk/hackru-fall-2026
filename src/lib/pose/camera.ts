export async function acquireCamera(
  mediaDevices: Pick<MediaDevices, "getUserMedia">,
  facingMode: "user" | "environment",
  signal: AbortSignal,
): Promise<MediaStream> {
  const stream = await mediaDevices.getUserMedia({
    audio: false,
    video: {
      facingMode: { ideal: facingMode },
      width: { ideal: 640 },
      height: { ideal: 480 },
      frameRate: { ideal: 30 },
    },
  });
  if (signal.aborted) {
    stream.getTracks().forEach((track) => track.stop());
    throw new DOMException("Camera request cancelled", "AbortError");
  }
  return stream;
}

export async function waitForVideo(
  video: HTMLVideoElement,
  signal: AbortSignal,
): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const cleanup = () => {
      clearTimeout(timeout);
      video.removeEventListener("loadeddata", ready);
      video.removeEventListener("error", failed);
      signal.removeEventListener("abort", aborted);
    };
    const ready = () => {
      if (video.readyState >= 2 && video.videoWidth > 0) {
        cleanup();
        resolve();
      }
    };
    const failed = () => {
      cleanup();
      reject(new Error("Camera video could not become ready"));
    };
    const aborted = () => {
      cleanup();
      reject(new DOMException("Video setup cancelled", "AbortError"));
    };
    const timeout = setTimeout(failed, 12000);
    video.addEventListener("loadeddata", ready);
    video.addEventListener("error", failed);
    signal.addEventListener("abort", aborted, { once: true });
    if (signal.aborted) aborted();
    else ready();
  });
  await video.play();
}
