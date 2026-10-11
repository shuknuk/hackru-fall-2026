# Menhel Motion

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

## Accounts, guest workouts and cloud summaries

Guests can save five real workouts. IndexedDB records a workout only after the local session transaction succeeds; repeated saves of the same session, previews, calibration, drafts, replay, comparison, history and synthetic samples do not consume another workout. Deleting sessions does not restore guest allowance. Active-start reservations and the final save transaction coordinate tabs so the fifth slot cannot be claimed twice. Signed-in users can record without a subscription limit.

The guest allowance is browser-local, not a secure identity system. Clearing browser data, changing browser profiles/origins, or using another device resets it. Menhel does not use fingerprinting to prevent that. The five local sessions remain available after sign-up. `/dashboard` offers a separate, explicit **Import eligible guest summaries** action; sign-in alone never uploads them.

Clerk handles email and any enabled Google sign-in strategy. Configure the Clerk and Tiger variables shown in `.env.example`; all three core values (`DATABASE_URL`, `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, and `CLERK_SECRET_KEY`) are required for cloud use. Clerk production domains and OAuth redirect URLs must be allowed in the Clerk Dashboard before deploying. Account APIs derive the owner from Clerk's verified server session and never accept a client owner ID.

The Clerk browser and UI bundles are pinned in `.env.example` to the versions verified with the installed SDK. Update those pins deliberately with `@clerk/nextjs`; an unconfigured or malformed key pair leaves the local guest experience available instead of mounting a broken account client.

Workout capture remains local-first. Full landmarks, frames, images, video and calibration data never enter Tiger Data. If the account owner enables summary sync, completed/interrupted live workouts queue a bounded measurement summary after the local save. Failed uploads and deletes stay queued for retry; cloud outages do not block recording or local replay. Another device can show a cloud summary, but cannot reconstruct a skeleton replay.

Tiger Data setup:

```sh
# Use the administrative URL for migrations, then the restricted app-role URL at runtime.
MIGRATION_CONFIRM_DB=tsdb npm run db:migrate
npm run db:verify
```

The migration checks the installed TimescaleDB version before using `by_range`, creates user/session-key tables, the `workout_metrics` hypertable, user/time indexes, the `daily_workout_stats` continuous aggregate, and its hourly refresh policy. `db:verify` is read-only. The live service has a restricted `menhel_app` runtime role; keep `tsdbadmin` migration-only. The free Tiger Cloud service has no managed pooler, so the server reuses a two-connection pool with short timeouts. The service's private CA is pinned with hostname verification; its current certificate expires October 20, 2027 and must be replaced before then or whenever Tiger rotates the service CA.

## Verification

Browser tests run against the production build on a dedicated fresh port. Install the standard test browser with `npx playwright install chromium`. A nonstandard executable can be specified using `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH`. `PLAYWRIGHT_FAKE_VIDEO` enables explicit prerecorded webcam input for real SDK integration; it is test tooling only. The calibration/recording integration test replaces browser camera/worker APIs with explicitly simulated landmark sequences and a deterministic capture clock. Neither is physical-camera acceptance.

When `.env.local` contains Clerk keys, build the deterministic guest matrix explicitly without them because Next.js embeds public environment values into the production bundle:

```sh
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=disabled CLERK_SECRET_KEY=disabled npm run build
npm run test:e2e -- --grep-invert "a verified worker update"
```

The live account/database check is opt-in and creates then deletes a Clerk test user and Tiger workout summary:

```sh
npm run build
PLAYWRIGHT_LIVE_AUTH=1 DATABASE_URL='restricted Tiger application-role URL' \
  npx playwright test tests/e2e/auth-live.spec.ts --project=chromium
```

See [the device checklist](docs/DEVICE_CHECKLIST.md) before claiming phone compatibility. Installation/offline readiness and movement heuristics require real-device checks. The five development-tool audit findings remain documented; the production-only audit returned zero findings.

## Provenance

The original 47-file Menhel import is preserved under `legacy/menhel/`. The original repository remains unchanged. [Hash manifest](docs/import-provenance.json). Event code-reuse eligibility remains unresolved.

The session setup guide uses the free-tier Bodyweight Squat illustrations from [RepDB](https://repdb.co), under the included [RepDB free-tier license](docs/LICENSE-repdb.md). The app displays the required attribution beside the images.
