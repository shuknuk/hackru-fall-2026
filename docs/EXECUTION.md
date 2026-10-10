# Execution ledger

## M0 constraints — recorded, evidence still pending

Checked October 10, 2026. The official [HackRU Fall 2026 website](https://www.hackru.org/) lists hacking starting Saturday at noon, submissions due Sunday at noon and judging starting Sunday at 1 PM. These are event-local schedule times; interpreting them as America/New_York is a venue-based assumption. At the start of this work, approximately 23 hours remained to the published submission time.

Team limit is four humans. The repository description lists Aditya, Ayra and Kinshuk, a three-person team. Current attendance, physical phones/browser versions and stable demo device remain unconfirmed. Current workspace is Node 24.19.0 and npm 11.9.0. Desktop browser emulation is not physical-device evidence.

The site does not establish the Fall 2026 pre-existing code/AI-use submission policy. No organizer clearance is claimed and no message has been sent. Ask an on-site organizer and record their answer before asserting eligibility. Newly implemented web code is tracked separately from the 47-file historical import. Archiving does not establish eligibility.

Read the master contract, source import and root native guidance. Preserved exact imported bytes under legacy/menhel, including the original README and native agent instructions. docs/import-provenance.json lists each file SHA-256 and size. Original repo unchanged.

## M1 scaffold — built and deployed; acceptance partial

New root Next.js App Router package, strict TypeScript, Tailwind v4, semantic home and session setup shell, scripts and production-browser checks. Archive excluded from TypeScript, ESLint and Vitest. No camera request or invented session metrics.

Dependencies are exact-pinned in package.json and package-lock.json. TypeScript 5.9.3 was selected instead of the newly observed 7.x major to reduce tooling compatibility risk; acceptance still depends on the clean build. Exact Node is recorded in .nvmrc.

Verified: npm ci completed, lint passed with no warnings after config correction, strict typecheck passed, production build generated / and /session, and all 47 archive hashes passed.

The initial build exposed empty root app directories shadowing src/app; these were removed and the correct route inventory verified.

Playwright browser downloads returned unusable zero-size/truncated archives for 1.64.0 and an attempted 1.58.2 fallback, including headless-shell retry. Reverted to the planned 1.64.0 because downgrading did not fix the download. Browser tests remain unverified until a browser can launch.

Verified server responses: production / and /session return 200 HTML with the expected page content. npm run test:e2e was executed; both browser projects stopped at launch because the required browser executable is absent, so no UI interaction assertions passed.

Cloud desktop Chrome check passed: home rendered, Explore session setup navigated to /session, Back to Menhel returned home, and measured document width 1348px was within the 1363px viewport. Screenshot visually confirmed the olive/sage shell. App-origin console errors were not observed; extension metadata and earlier Vercel-login FedCM errors were present and excluded from application evidence. Keyboard focus checks were inconclusive in this browser surface.

Pending evidence: automated browser suite, keyboard acceptance, mobile viewport and real-phone shell check. Skill references are active project guidance; upstream skill packages have not been installed. SDK/WASM/model checksums and live runtime belong to M2 and are still pending.

## M2 camera spike — implemented; device acceptance pending

Prepared exact MediaPipe Tasks Vision 1.1.0 classic bundle and matched SIMD/module/non-SIMD WASM assets from the installed package. The official Lite float16 v1 model is 5,777,746 bytes with SHA-256 59929e1d1ee95287735ddd833b19cf4ac46d29bc7afddbbf6753c459690d574a. Every prepared asset is checked against docs/mediapipe-assets.json. Apache-2.0 license and official model-card attribution are recorded. Generated public assets are reproduced during predev/prebuild rather than committed.

Explicit user-initiated Start/Stop, front/rear preference, video readiness, stream/engine/frame cleanup, late-permission cancellation, hidden-page stop and camera-disconnection errors are implemented. Fresh-frame scheduling permits one inference in flight. Confidence-gated torso/limb skeleton clears when results become stale. Missing confidence remains null; optional presence is gated only when supplied. No calibration, rep counting or invented measurements are shown.

Worker CPU uses a same-origin classic worker to preserve the SDK importScripts loader, transferable ImageBitmap input and OffscreenCanvas. The worker exists as a standalone public script rather than a Next.js module worker; production-server integration checks exercise the deployed file structure. Main-thread CPU/GPU are explicit diagnostic alternatives, with no automatic fallback. Main-thread synchronous inference may block controls; physical-device evidence must determine whether it is usable.

Asset preparation, strict typecheck, lint, production build, two meaningful unit tests (late permission cleanup and confidence adaptation), and all 47 archive provenance checks passed. A corrupt generated Turbopack cache was cleared before the successful build.

Browser provisioning workaround: the Playwright CDN downloads failed previously, but npm-distributed @sparticuz/chromium 153.0.0 provided Chromium 153.0.8010.0 for automated checks. This is scratch-only test tooling, not an application dependency. Chromium desktop and iPhone-sized Chromium checks exercise shell navigation, denied permissions and late permission release; they do not represent Safari or a physical phone.

Inference integration uses the official https://storage.googleapis.com/mediapipe-assets/pose.jpg (SHA-256 c8a830ed683c0276d713dd5aeda28f415f10cd6291972084a40d0d8b934ed62b), converted to a looping 640×428 prerecorded YUV webcam input. Tests invoke the actual SDK/model, require 33 detected landmarks and at least 12 frames, and check track release and Stop/restart. This static image is integration evidence only, not motion accuracy or live-camera proof. Software-rendered virtual-hardware latency is unsuitable for selecting the phone engine. Two initial frame-count polls exceeded five seconds; the tests now allow twenty seconds and run sequentially to reduce CPU contention.

See DEVICE_CHECKLIST.md for live-person camera, phone/Safari, facing, orientation, visibility, performance and cleanup acceptance. M2 remains partial until those results are recorded. M3–M8 were subsequently implemented under the user’s explicit authorization to defer phone acceptance; see the current implementation evidence below. M9 release acceptance is still partial.

## Version decisions

Exact direct package versions, licenses, engines and peer declarations are in dependency-metadata.json, with transitive versions/integrities in package-lock.json. ESLint 10.12.0 caused peer warnings from bundled plugins that only declare support through 9; selected 9.39.5. npm marks 9.39.5 unsupported, so this is an explicitly recorded compatibility compromise pending an upstream plugin upgrade. No peer overrides are used in the selected package.

## HTTPS deployment evidence

- Team: shuk’s projects / kinshukgoels-projects.
- Project: menhel-motion (`prj_vutnVrEjmKulOQ7JRm1WC0OM2Lme`).
- Code commit: `bda60bb36928d92c11543734f2a9a73f9860d9cb`.
- Deployment: `dpl_HHUdpWCtfpTKGS2LmFhN7h9CR8qN`.
- Target: staging. Status: READY. Framework: Next.js. Configured Node: 24.x.
- URL: https://menhel-motion-3p7w4rw3q-kinshukgoels-projects.vercel.app
- Vercel build duration: approximately 42 seconds, from buildingAt to ready.
- Deployment Protection: Vercel authentication enabled for all except custom domains, as returned by project settings. Protection was not disabled.
- Authenticated HTTPS fetches of / and /session returned 200 with expected shell content. This proves server delivery, not visual layout, keyboard navigation, browser hydration or physical-phone compatibility.

An initial request with omitted target was unexpectedly classified as production. Cancelled before completion (`dpl_8SrEg9axAqNfb3zACn5XHzEzow8w`, CANCELED). An explicit preview target was rejected by the API; staging was accepted and confirmed. No production release is claimed.

External skills remain reviewed references, with root AGENTS.md active. Installing complete upstream skill bundles remains open; do not claim that requirement passed. M1 is therefore partial, pending full browser/phone acceptance and selected skill installation where supported. The M2 camera/model spike and subsequent implementation evidence follow below.

Final selected-lockfile npm ci, lint, typecheck and provenance check were rerun after restoring Playwright 1.64.0 and passed. No unit tests exist yet; no movement or camera behavior is claimed as tested.

M2 browser result: all six desktop Chromium tests passed in the sequential rerun, including actual worker CPU, main CPU and main GPU inference, denied permission, late permission cancellation and shell navigation. GPU integration required approximately 72 seconds including model initialization/restart; this is not a usability performance pass. The final mobile-sized Chromium rerun passed all three shell/denial/cancellation checks; three inference variants were deliberately skipped on that project. Total final browser evidence is nine passed, three intentional skips across sequential desktop/mobile runs. This is not iPhone/Safari evidence.

## M2 HTTPS staging evidence

Code commit b04947b7b0665d7667d07a59763ea36504600e7e. Deployment dpl_5pYEbHvRmbSKtQjFUgRZcqu4yDF1 is READY on target staging, Node 24.x, Next.js; build took approximately 44 seconds. URL: https://menhel-motion-dpwwdzia9-kinshukgoels-projects.vercel.app/session . Authentication protection remains enabled. Authenticated fetches of /session, /pose-worker.js and /mediapipe/asset-manifest.json returned 200, with expected Start camera content and pinned model checksum. This establishes delivery, not physical-camera behavior.

The build reported five high npm audit findings through the development-only eslint-config-next → @next/eslint-plugin-next → fast-glob → micromatch → braces chain, rooted in GHSA-vfj7-8cjw-p6xm (deeply nested glob-pattern stack exhaustion). Audit suggests a breaking downgrade to eslint-config-next 14.2.35; it was not applied to the Next 16 setup. Record and resolve the tooling advisory before final release; do not claim a clean full-dependency audit.

Production-only audit (`npm audit --omit=dev --json`) returned zero vulnerabilities. This does not erase the development tooling findings.

## M3–M8 current implementation — October 10, 2026

The user explicitly requested continuing the full build while the iPhone was unavailable. This overrides waiting for physical-device acceptance before subsequent development; it does not establish device acceptance. Earlier entries above record the historical milestone state, not the current feature inventory.

Implemented body-only bounded session schemas, aspect-corrected projected knee/hip/lean measurements, null-safe confidence gates, median/MAD calibration, anatomical-side locking and time-aware smoothing. The hysteresis/dwell detector requires standing, descent, a qualified bottom, ascent and standing return. Incomplete, timed-out or materially gapped cycles are excluded. Tracking coverage is derived from valid timestamp intervals. One segment is supported per set; interruption finishes that set rather than resuming across a discontinuity.

The capture UI connects explicit camera start, side/setup confirmation, standing baseline, a comfortable setup cycle, ready, recording, finish, results and profile recheck for another set. Limits are ten completed reps, 90 seconds, 1,801 samples and 5 MiB. A bounded body-landmark snapshot replaces the draft about every two seconds, rather than append-only chunks. Finishing releases the camera and atomically commits the session/profile while removing its draft. Failed persistence remains visible with export/retry. Interrupted draft recovery preserves the original timestamp and excludes unfinished cycles; the last uncheckpointed seconds may be absent.

IndexedDB history supports twenty sessions, draft recovery, export/import and confirmed deletion. Imports are strictly validated and derived geometry/filter/reps/summary are recomputed; declared provenance is labelled, not authenticated. It does not silently remove earlier sessions to make room. Schema version 1 accepts only the implemented schema, with unsupported versions rejected rather than pretending a migration exists.

Stored replay includes rep selection, original timestamps, scrubbing, play/pause, speed controls, knee trace, gap-aware skeletons and text metrics. Replay pauses when hidden and starts paused. Comparison checks model, algorithm, calibration/profile, anatomical side, camera facing, aspect and declared source. Confirmed compatible sets show valid-rep medians, directional deltas and at most three deterministic observations with metric IDs and sensitivity thresholds. Selected reps align start/bottom/end at 0/50/100 percent while preserving actual seconds. The standing-hip reference and fixed body scale are per session; there is no frame-wise recentering. This is projected motion observation, not clinical or 3D accuracy evidence.

The installable shell has verified 192/512 icons, a 512 maskable icon and a 180 Apple touch icon, native manifest metadata and contextual installation guidance. Explicit offline preparation verifies exact SHA-256 and byte length for literal versioned prerendered route HTML, all static chunks, icons and manifest. The current local inventory has 36 assets, about 1.08 MiB. Model/WASM are excluded; offline live tracking is not promised. A completeness marker is written last, failures never report ready, and explicit preparation repairs missing cache entries. Full-document navigation avoids relying on uncached RSC payloads. Service worker updates wait for explicit application and ask every window whether it is recording; unknown clients block. Old caches needed by open app versions are retained.

### Verification boundaries

- Production build, lint, strict typecheck, eighteen unit tests across three files, and all 47 unchanged archive hashes passed. Unit tests exercise both anatomical sides, confidence absence, aspect geometry, hysteresis/partial/gapped cycles, smoothing/timestamp ordering, strict import bounds/tampering, phase alignment and directional observations.
- Browser tests use production Next through a test-only reverse proxy, never an application/deployed API. The proxy can serve a different worker generation for update coordination. This tests recording-tab blocking and safe activation; it does not prove a distinct application-bundle A→B upgrade.
- The calibration/three-rep capture test explicitly replaces browser camera/worker APIs with authored landmark sequences, a canvas stream and a deterministic 20 Hz capture clock. It validates UI state transitions, local persistence, camera release and replay after reload; it is not MediaPipe movement accuracy evidence.
- Separate camera tests use the real SDK/model and a prerecorded static image input. They cover worker CPU and main CPU/GPU integration, not live-person performance.
- The synthetic pair is labelled on screens and in stored/exported data. Browser request checks confirm sample/replay/comparison flows do not load the vision model. Source review found no camera/landmark upload in the core flow; camera pixels exist only in local video/inference buffers. Export is explicitly user initiated.
- A combined browser run exposed virtual-host scheduling gaps up to 235 ms in the wall-clock synthetic recording test. The application correctly invalidated these cycles under the unchanged 150 ms rule. The semantic recording harness now advances a declared deterministic capture clock per delivered video frame, separating UI/state-machine integration from scheduling/performance acceptance. Real SDK checks retain actual timestamps.

Browser integration covers local reload, selected phase metrics, export/import/delete, unsupported import, storage-open failure, draft recovery, the twenty-slot cap, hard offline reload of history/replay/compare, cache repair, failed inventory preparation and cross-tab update coordination. Chromium phone-size checks are not Safari evidence.

Remaining release gates: physical iPhone/Safari installation and permissions, live-person pilot counts, actual device engine/FPS/latency/heat, a real distinct-bundle update, three-minute rehearsal, consented demo recording and organizer code/AI-use eligibility. The master MVP and DEVICE_CHECKLIST.md retain those pending checks. Complete upstream skill bundles remain reviewed references, not installed packages. The existing development-only audit advisory remains open; no clean full-dependency audit is claimed.

Final browser evidence: the full matrix passed 21 checks and intentionally skipped three mobile real-SDK variants; the two wall-clock synthetic recording cases failed as described above. After the test-only clock correction, both targeted desktop and phone-sized recording cases passed (17.0 and 17.3 seconds). The unchanged application build therefore has 23 passing browser cases and three deliberate skips across the full run plus targeted rerun. Lint and strict typecheck also passed after the harness changes. No physical device or Safari acceptance is claimed.
