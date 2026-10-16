# SpotOn

Browser-based squat analysis built by a three-person HackRU team. Record a side-view set, replay your movement, and compare attempts using pose data saved on your device.

[Live demo](https://spot-on-motion.vercel.app/) · [Device testing checklist](docs/DEVICE_CHECKLIST.md)

## What it does

- **Record:** MediaPipe tracks pose landmarks during short squat sets, with calibration and repetition detection.
- **Review:** Replay the skeleton, scrub through a set, and inspect joint-angle measurements.
- **Compare:** Align compatible attempts by movement phase while preserving their actual timing.
- **Keep data local:** Store recordings and replay data in IndexedDB, without uploading camera images or video.
- **Optional extras:** Gemini explanations, prerecorded voice guidance, and opt-in workout-summary trends with Tiger Data.

**Stack:** Next.js, React, TypeScript, Tailwind CSS, MediaPipe, IndexedDB, and PostgreSQL/TimescaleDB for optional cloud summaries.

## Try it

1. Open the [demo](https://spot-on-motion.vercel.app/) and start a squat session.
2. Choose the visible side, keep your full body in frame, and complete calibration.
3. Record a set, then finish to review the results. Sets are limited to 10 completed reps or 90 seconds.
4. Open saved history to replay a set or compare two compatible attempts.

History also includes clearly labelled synthetic samples, so you can explore replay and comparison without a camera. Those samples demonstrate the software, not real movement accuracy.

## Run locally

Use **Node.js 24.19.0** (see [.nvmrc](.nvmrc)) and **npm 11.9.0**.

```sh
npm ci
npm run dev
```

Open [localhost:3000](http://localhost:3000). Camera access requires permission and a secure context: localhost works locally; use HTTPS for a hosted or phone-accessible deployment.

The core recording, replay, and comparison flow needs no API keys or database. Development and build commands prepare the pinned MediaPipe assets automatically; the first run needs network access to download the pose model.

### Optional services

Copy [.env.example](.env.example) to `.env.local` and configure only the features you need. Keep all keys and database URLs server-side.

| Feature | Configuration |
| --- | --- |
| Gemini explanations | `GEMINI_API_KEY`; optional `GEMINI_MODEL`. The example file also supports two additional keys. Local measurements and comparisons remain available without Gemini. |
| Tiger Data trends | `DATABASE_URL` for the restricted application role. Requires TimescaleDB 2.13+ and the migrations below. |
| Voice guidance | Checked-in ElevenLabs audio clips play without a key. `ELEVENLABS_API_KEY` is needed only to deliberately regenerate narration with `node scripts/generate-narration.mjs`, which uses provider credits. |

For Tiger Data, configure the service's trusted CA in [the database configuration](src/lib/db/tiger-cloud-ca.json); the checked-in CA is pinned to the existing service. Use an administrative database URL only for migration, and set `MIGRATION_CONFIRM_DB` to the intended database name in `.env.local`:

```sh
npm run db:migrate
npm run db:verify
```

Switch `DATABASE_URL` to the restricted application-role URL before running the app. Migration changes the target database; verification is read-only. See the [migrations](migrations/) and [implementation notes](docs/EXECUTION.md) for the existing service setup.

## Privacy and storage

No sign-in is required. Full pose recordings, calibration data, and replay samples stay in the browser. The local history holds up to 20 recordings; browser storage can be cleared or evicted.

- **Gemini:** Explicitly requested help sends measurement summaries and any question you enter to the server for explanation, not camera images, video, or pose landmarks.
- **Tiger Data:** Opting in uploads workout summaries, scoped by a random credential stored in that browser. It does not upload raw recordings. You can delete the cloud history while keeping local recordings.
- **Same browser, same URL:** Local recordings and the cloud-history credential do not transfer between browsers, devices, or deployment URLs. Clearing site data loses access to that browser's cloud history; delete cloud history first if you want it removed.

In a production build, explicit offline preparation lets you reopen saved history, replay, and comparison. Offline live pose tracking is not promised.

## Development checks

```sh
npm run lint
npm run typecheck
npm test
npm run build
```

To preview the production build, run `npm run start`. For browser tests, install Chromium with `npx playwright install chromium`, then run:

```sh
npm run test:e2e -- --grep-invert "a verified worker update"
```

Playwright starts its own production test server. The excluded worker-update case is documented as obsolete in [execution evidence](docs/EXECUTION.md). Synthetic fixtures and prerecorded-camera integration tests do not establish physical-device accuracy.

## Status and credits

Physical-camera accuracy, iPhone/Safari performance, installation, and offline behavior on real devices still need the [device checks](docs/DEVICE_CHECKLIST.md). Movement estimates are not a medical assessment. HackRU code-reuse eligibility remains unresolved; see [execution evidence](docs/EXECUTION.md) for recorded results and outstanding checks.

The active application is the Next.js project at the repository root. An earlier React Native/Expo import is documented in the [provenance manifest](docs/import-provenance.json). The referenced `legacy/menhel/` archive is absent from current `main`, so `npm run verify:provenance` cannot pass until it is restored.

Session setup illustrations are from [RepDB](https://repdb.co), under the included [license](docs/LICENSE-repdb.md).

For the full design and development history, see the [MVP and roadmap](MENHEL_MOTION_MASTER_MVP.md).
