"use client";
import { useEffect, useRef, useState } from "react";
const VERSION = process.env.NEXT_PUBLIC_APP_VERSION;
interface InstallPrompt extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: string }>;
}
function workerMessage(
  worker: ServiceWorker,
  type: string,
): Promise<{
  ready?: boolean;
  version?: string;
  safe?: boolean;
  error?: string;
}> {
  return new Promise((resolve, reject) => {
    const channel = new MessageChannel();
    const timer = setTimeout(
      () => {
        channel.port1.close();
        reject(new Error("Offline worker did not respond"));
      },
      type === "PREPARE" ? 60000 : 10000,
    );
    channel.port1.onmessage = (e) => {
      clearTimeout(timer);
      channel.port1.close();
      resolve(e.data);
    };
    worker.postMessage({ type }, [channel.port2]);
  });
}
export default function PwaControls() {
  const [message, setMessage] = useState(
    "Prepare this app online to reopen saved history, replay and comparison offline.",
  );
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(false);
  const [update, setUpdate] = useState(false);
  const [capture, setCapture] = useState(false);
  const [install, setInstall] = useState<InstallPrompt | null>(null);
  const registration = useRef<ServiceWorkerRegistration | null>(null);
  const reloading = useRef(false);
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    const query = (e: MessageEvent) => {
      if (e.data?.type === "PREPARE_ERROR") {
        setMessage(`Offline preparation failed: ${e.data.message}`);
        setBusy(false);
      }
      if (e.data?.type === "PREPARE_PROGRESS")
        setMessage(
          `Verifying app files ${e.data.completed} of ${e.data.total}…`,
        );
      if (e.data?.type === "UPDATE_QUERY")
        e.ports[0]?.postMessage({
          capturing: document.documentElement.dataset.recording === "true",
          version: VERSION,
        });
    };
    const control = () => {
      if (reloading.current) location.reload();
    };
    const prompt = (e: Event) => {
      e.preventDefault();
      setInstall(e as InstallPrompt);
    };
    const active = () =>
      setCapture(document.documentElement.dataset.recording === "true");
    navigator.serviceWorker.addEventListener("message", query);
    navigator.serviceWorker.addEventListener("controllerchange", control);
    window.addEventListener("beforeinstallprompt", prompt);
    window.addEventListener("menhel-recording", active);
    void navigator.serviceWorker
      .getRegistration()
      .then(async (r) => {
        if (!r) return;
        registration.current = r;
        setUpdate(!!r.waiting);
        if (navigator.serviceWorker.controller) {
          const status = await workerMessage(
            navigator.serviceWorker.controller,
            "STATUS",
          );
          setReady(!!status.ready && status.version === VERSION);
          if (status.ready && status.version === VERSION)
            setMessage(
              "Offline replay ready for this app version. Saved data remains in IndexedDB.",
            );
        }
        r.addEventListener("updatefound", () => {
          r.installing?.addEventListener("statechange", () => {
            if (r.waiting) setUpdate(true);
          });
        });
        void r.update().catch(() => {});
      })
      .catch(() =>
        setMessage(
          "Could not check offline readiness. Reconnect and prepare again.",
        ),
      );
    const online = () => {
      if (!navigator.onLine)
        setMessage(
          ready
            ? "You are offline. Saved replay is prepared."
            : "You are offline. First-time preparation needs a connection.",
        );
    };
    window.addEventListener("offline", online);
    return () => {
      navigator.serviceWorker.removeEventListener("message", query);
      navigator.serviceWorker.removeEventListener("controllerchange", control);
      window.removeEventListener("beforeinstallprompt", prompt);
      window.removeEventListener("menhel-recording", active);
      window.removeEventListener("offline", online);
    };
  }, [ready]);
  async function prepare() {
    setBusy(true);
    setReady(false);
    setMessage("Preparing and verifying app files. Keep this page open…");
    try {
      if (!("serviceWorker" in navigator))
        throw new Error("This browser does not support offline preparation");
      if (!navigator.onLine) throw new Error("Reconnect before preparing");
      if (navigator.serviceWorker.controller) {
        const status = await workerMessage(
          navigator.serviceWorker.controller,
          "STATUS",
        );
        if (status.version === VERSION) {
          const repaired = await workerMessage(
            navigator.serviceWorker.controller,
            "PREPARE",
          );
          if (!repaired.ready)
            throw new Error(repaired.error ?? "Offline preparation failed");
          setReady(true);
          setMessage(
            "Offline replay ready for this app version. Camera/model assets are not included.",
          );
          return;
        }
      }
      const hadActive = Boolean(
        navigator.serviceWorker.controller ||
          (await navigator.serviceWorker.getRegistration())?.active,
      );
      const r = await navigator.serviceWorker.register("/sw.js", {
        scope: "/",
        updateViaCache: "none",
      });
      registration.current = r;
      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(
          () =>
            reject(
              new Error(
                "Preparation timed out. Check the connection and retry.",
              ),
            ),
          60000,
        );
        const installing = r.installing;
        const check = () => {
          if (
            installing?.state === "installed" ||
            installing?.state === "activated" ||
            (!installing && (r.active || r.waiting))
          ) {
            clearTimeout(timeout);
            resolve();
          } else if (installing?.state === "redundant" || !installing) {
            clearTimeout(timeout);
            reject(
              new Error(
                "An app file failed verification. Reconnect and retry preparation.",
              ),
            );
          }
        };
        r.addEventListener("updatefound", () =>
          r.installing?.addEventListener("statechange", check),
        );
        installing?.addEventListener("statechange", check);
        check();
      });
      if (r.waiting && hadActive) {
        setUpdate(true);
        setMessage(
          "A verified update is waiting. Stop capture and apply it to prepare the new version.",
        );
        return;
      }
      await navigator.serviceWorker.ready;
      if (!navigator.serviceWorker.controller)
        await new Promise<void>((resolve, reject) => {
          const timer = setTimeout(
            () =>
              reject(
                new Error(
                  "Refresh once to give the offline worker control, then retry preparation.",
                ),
              ),
            10000,
          );
          navigator.serviceWorker.addEventListener(
            "controllerchange",
            () => {
              clearTimeout(timer);
              resolve();
            },
            { once: true },
          );
        });
      let status = await workerMessage(
        navigator.serviceWorker.controller!,
        "STATUS",
      );
      if (status.version !== VERSION)
        throw new Error(
          "The active worker belongs to another app build. Refresh online and retry.",
        );
      if (!status.ready) {
        const repaired = await workerMessage(
          navigator.serviceWorker.controller!,
          "PREPARE",
        );
        if (!repaired.ready || repaired.version !== VERSION)
          throw new Error(
            repaired.error ?? "Offline files could not be verified. Retry online.",
          );
        status = await workerMessage(
          navigator.serviceWorker.controller!,
          "STATUS",
        );
      }
      if (!status.ready || status.version !== VERSION)
        throw new Error(
          "The current app inventory is still incomplete after verification",
        );
      setReady(true);
      setMessage(
        "Offline replay ready for this app version. Camera/model assets are not included.",
      );
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Offline preparation failed");
    } finally {
      setBusy(false);
    }
  }
  async function apply() {
    try {
      const w = registration.current?.waiting;
      if (!w) throw new Error("No update is waiting");
      reloading.current = true;
      const result = await workerMessage(w, "UPDATE");
      if (!result.safe) {
        reloading.current = false;
        throw new Error(
          "Another tab is recording or could not confirm it is idle. Stop capture in all app tabs and retry.",
        );
      }
    } catch (e) {
      reloading.current = false;
      setMessage(e instanceof Error ? e.message : "Update failed");
    }
  }
  return (
    <aside className="panel pwa-controls" aria-labelledby="offline-title">
      <h2 id="offline-title">Keep replay close</h2>
      <p role="status">{message}</p>
      <div className="actions">
        <button
          className="secondary-button"
          disabled={busy || capture}
          onClick={() => void prepare()}
        >
          {busy
            ? "Preparing…"
            : ready
              ? "Verify offline preparation"
              : "Prepare offline replay"}
        </button>
        {update ? (
          <button
            className="secondary-button"
            disabled={capture || busy}
            onClick={() => void apply()}
          >
            Apply saved-data-safe update
          </button>
        ) : null}
        {install ? (
          <button
            className="secondary-button"
            onClick={() =>
              void install
                .prompt()
                .then(() => install.userChoice)
                .then(() => setInstall(null))
            }
          >
            Install SpotOn
          </button>
        ) : null}
      </div>
      <details>
        <summary>Install on your device</summary>
        <p>
          iPhone or iPad in Safari: open the Share menu, choose Add to Home
          Screen, then Add. Other supported browsers may offer an install icon
          in their menu or address bar. Installation and phone camera
          performance still need device testing.
        </p>
        <p>
          First visit needs internet. Prepare the current version before going
          offline. Browser storage can be cleared or evicted; export important
          sessions. Live offline capture is not promised.
        </p>
      </details>
    </aside>
  );
}
