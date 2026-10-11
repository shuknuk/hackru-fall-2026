# SpotOn

A Next.js + MediaPipe application for short side-view bodyweight squat sets, local landmark recording, skeleton replay and phase-aligned attempt comparison. The implementation now includes the M3–M8 feature flow. Physical camera accuracy, iPhone installation and device performance remain unverified. This is an observation tool, not a medical assessment.

## Build contract

Read [the master MVP and roadmap](MENHEL_MOTION_MASTER_MVP.md), [execution evidence](docs/EXECUTION.md), and [agent instructions](AGENTS.md). The user authorized continuing implementation before phone testing; deferred acceptance checks remain open.

## Run

Use Node 24.19.0 and npm 11.9.0.

```sh
npm ci
npm run dev
```

For a production/PWA check:

```sh
npm run lint
npm run typecheck
npm test
npm run build
npm run start
npm run test:e2e
```

The initial build needs access to Google's pinned model download. Prebuild verifies exact model/SDK/WASM hashes. The production build creates versioned static offline shells, an asset inventory and a service worker. Offline preparation is explicitly user-triggered. Use production mode for offline tests.

## Use

Start at `/session`, choose the visible anatomical side and confirm a stable side view. Calibrate standing and one comfortable setup cycle, then record a set. Finish stops the camera and saves body landmarks locally. Record Another Set reuses calibration after a standing recheck. Sets are limited to ten completed reps or 90 seconds.

`/history` provides labelled synthetic samples, local history, draft recovery, per-set deletion and set selection. `/replay?id=...` provides play/pause, scrubbing, rep selection, angle traces and gap-aware skeletons. `/compare?a=...&b=...` checks source/setup compatibility before numerical observations and aligns start, bottom and end while retaining real durations.

Synthetic samples demonstrate software behavior, not a recorded person or pose accuracy. Imported sources are declared provenance; imports are labelled and metrics are recomputed. Twenty session slots apply. Storage can fail or be evicted; saved sets have no cloud backup. Local history belongs to the browser origin and does not automatically move between deployment URLs or installed-app storage contexts.

Compatible comparisons retain deterministic measurement observations. An optional Gemini explanation appears only after a separate opt-in and sends bounded aggregate measurements and their evidence IDs through the server; it never sends video, images, landmarks, session IDs or saved set records. Configure `GEMINI_API_KEY` server-side and optionally set `GEMINI_MODEL` (default `gemini-2.5-flash`). Without a key or a successful response, the deterministic comparison remains available.

Optional ElevenLabs narration: on the capture page, select **Enable voice guidance** for framing, calibration and rep announcements; mute it at any time. The 30 River voice clips are checked in, so playback needs no API key or paid API request. Only deliberate regeneration with `node scripts/generate-narration.mjs` uses `ELEVENLABS_API_KEY` from your environment or ignored `.env.local` and spends provider credits. Camera images and pose data are never sent to ElevenLabs. Framing cues are heuristics awaiting real-phone testing.

## Verification

Browser tests run against the production build on a dedicated fresh port. Install the standard test browser with `npx playwright install chromium`. A nonstandard executable can be specified using `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH`. `PLAYWRIGHT_FAKE_VIDEO` enables explicit prerecorded webcam input for real SDK integration; it is test tooling only. The calibration/recording integration test replaces browser camera/worker APIs with explicitly simulated landmark sequences and a deterministic capture clock. Neither is physical-camera acceptance.

See [the device checklist](docs/DEVICE_CHECKLIST.md) before claiming phone compatibility. Installation/offline readiness and movement heuristics require real-device checks. The five development-tool audit findings remain documented; the production-only audit returned zero findings.

## Provenance

The original 47-file Menhel import is preserved under `legacy/menhel/`. The original repository remains unchanged. [Hash manifest](docs/import-provenance.json). Event code-reuse eligibility remains unresolved.

The session setup guide uses the free-tier Bodyweight Squat illustrations from [RepDB](https://repdb.co), under the included [RepDB free-tier license](docs/LICENSE-repdb.md). The app displays the required attribution beside the images.
