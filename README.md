# SpotOn! 

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

Synthetic samples demonstrate software behavior, not a recorded person or pose accuracy. Imported sources are declared provenance; imports are labelled and metrics are recomputed. Twenty local session slots apply. Local storage can fail or be evicted. Full replays belong to the browser origin and do not automatically move between deployment URLs, devices, accounts, or installed-app storage contexts.

Compatible comparisons retain deterministic measurement observations. An optional Gemini explanation appears only after a separate opt-in and sends bounded aggregate measurements and their evidence IDs through the server; it never sends video, images, landmarks, session IDs or saved set records. Configure `GEMINI_API_KEY` server-side and optionally set `GEMINI_MODEL` (default `gemini-2.5-flash`). Without a key or a successful response, the deterministic comparison remains available.

Optional ElevenLabs narration: on the capture page, select **Enable voice guidance** for framing, calibration and rep announcements; mute it at any time. The 30 River voice clips are checked in, so playback needs no API key or paid API request. Only deliberate regeneration with `node scripts/generate-narration.mjs` uses `ELEVENLABS_API_KEY` from your environment or ignored `.env.local` and spends provider credits. Camera images and pose data are never sent to ElevenLabs. Framing cues are heuristics awaiting real-phone testing.

## Phone trends and Tiger Data

Every recording, replay, landmark and calibration value stays in the browser on the phone that captured it. There are no accounts, sign-ins, quotas, fingerprinting, or camera uploads.

Selecting **View measurements over time with Tiger Data** on `/dashboard` creates a random 256-bit credential in that phone's IndexedDB, then queues current and future completed/interrupted workout summaries. The server hashes the credential before using it as the device scope; Tiger Data receives no raw credential, email, name, camera image, video, landmarks, replay samples or calibration data. It stores only dated rep count, estimated knee bend, bend variation, estimated ascent time, tracking coverage, visible side and algorithm version.

Cloud trouble never blocks local recording or replay. Queued uploads and deletions retry the next time this phone opens the trend view. Deleting a local workout queues deletion of its Tiger Data summary. **Delete Tiger Data history** removes this phone's cloud summaries and credential while retaining local recordings. Clearing browser data also loses access to this phone's Tiger Data history; it cannot be recovered or moved to another phone.

Use the same stable site URL and browser on the testing phone: preview hostnames, private browsing and other browsers have separate local histories. Daily counts query the Timescale hypertable directly so deletions are reflected immediately rather than waiting for the aggregate refresh.

Tiger Data setup:

```sh
# Use the administrative URL for migrations, then the restricted app-role URL at runtime.
MIGRATION_CONFIRM_DB=tsdb npm run db:migrate
npm run db:verify
```

The migration checks the installed TimescaleDB version before using `by_range`, creates phone/session-key tables, the `workout_metrics` hypertable, device/time indexes, the `daily_workout_stats` continuous aggregate, and its hourly refresh policy. It also migrates the earlier Clerk-named columns to phone-scoped names without changing measurements. `db:verify` is read-only. The live service has a restricted `menhel_app` runtime role; keep `tsdbadmin` migration-only. The free Tiger Cloud service has no managed pooler, so the server reuses a two-connection pool with short timeouts. The service's private CA is pinned with hostname verification; its current certificate expires October 20, 2027 and must be replaced before then or whenever Tiger rotates the service CA.

## Verification

Browser tests run against the production build on a dedicated fresh port. Install the standard test browser with `npx playwright install chromium`. A nonstandard executable can be specified using `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH`. `PLAYWRIGHT_FAKE_VIDEO` enables explicit prerecorded webcam input for real SDK integration; it is test tooling only. The calibration/recording integration test replaces browser camera/worker APIs with explicitly simulated landmark sequences and a deterministic capture clock. Neither is physical-camera acceptance.

Run browser checks against the production build:

```sh
npm run build
npm run test:e2e -- --grep-invert "a verified worker update"
```

See [the device checklist](docs/DEVICE_CHECKLIST.md) before claiming phone compatibility. Installation/offline readiness and movement heuristics require real-device checks. The five development-tool audit findings remain documented; the production-only audit returned zero findings.

## Provenance

The original 47-file Menhel import is preserved under `legacy/menhel/`. The original repository remains unchanged. [Hash manifest](docs/import-provenance.json). Event code-reuse eligibility remains unresolved.

The session setup guide uses the free-tier Bodyweight Squat illustrations from [RepDB](https://repdb.co), under the included [RepDB free-tier license](docs/LICENSE-repdb.md). The app displays the required attribution beside the images.
