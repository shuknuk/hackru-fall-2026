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

See DEVICE_CHECKLIST.md for live-person camera, phone/Safari, facing, orientation, visibility, performance and cleanup acceptance. M2 remains partial until those results are recorded. M3–M9 are not started; this is not yet an installable/offline PWA or a completed movement MVP.

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

External skills remain reviewed references, with root AGENTS.md active. Installing complete upstream skill bundles remains open; do not claim that requirement passed. M1 is therefore partial, pending full browser/phone acceptance and selected skill installation where supported. M2 camera/model spike is next.

Final selected-lockfile npm ci, lint, typecheck and provenance check were rerun after restoring Playwright 1.64.0 and passed. No unit tests exist yet; no movement or camera behavior is claimed as tested.

M2 browser result: all six desktop Chromium tests passed in the sequential rerun, including actual worker CPU, main CPU and main GPU inference, denied permission, late permission cancellation and shell navigation. GPU integration required approximately 72 seconds including model initialization/restart; this is not a usability performance pass. The final mobile-sized Chromium rerun passed all three shell/denial/cancellation checks; three inference variants were deliberately skipped on that project. Total final browser evidence is nine passed, three intentional skips across sequential desktop/mobile runs. This is not iPhone/Safari evidence.
