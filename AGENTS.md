# Menhel Motion implementation instructions

Read MENHEL_MOTION_MASTER_MVP.md before changing behavior. Follow M0–M9 in order and record evidence in docs/EXECUTION.md. Do not claim a milestone passed when physical-device or organizer evidence is missing.

The root is a new Next.js App Router PWA. legacy/menhel is a byte-preserved historical React Native/Expo archive. Do not edit its files, run its install scripts, or import its native modules into the web app. docs/import-provenance.json is the baseline.

Use strict TypeScript, semantic controls, small named imports, and Server Components by default. Add client boundaries only for browser APIs/state. Camera access must be user initiated with cleanup. Store pose data locally; do not upload camera images. Do not present clinical advice or invented movement measurements.

Commands: npm ci, npm run lint, npm run typecheck, npm run build, npm test, npm run test:e2e. Camera cancellation and confidence-adapter unit tests exist; add meaningful deterministic movement tests with M3/M4. Browser tests must run against the production build. Emulator shell checks do not count as a real-phone camera test.

Reviewed guidance and pinned source links are in docs/AI_GUIDELINES.md and the master document. Skills are reference material, not permission to run third-party installers. Recheck version-sensitive APIs against installed package documentation before using them.

Before version-sensitive Next.js changes, read the installed docs under node_modules/next/dist/docs/. The scaffold follows the installed 16.4.0 manual installation guidance.

On October 10, 2026 the user explicitly authorized M3 and later implementation while the iPhone was unavailable. Continue development and automated verification; keep physical-device, movement-pilot, install and organizer gates marked pending until actual evidence exists.
