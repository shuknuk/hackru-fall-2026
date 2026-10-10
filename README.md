# Menhel Motion

A new Next.js + MediaPipe PWA for comparing two side-view squat sets with local pose data. The M2 camera spike now provides explicit Start/Stop controls and a local MediaPipe skeleton, with worker CPU and main-thread CPU/GPU diagnostics. Recording, rep counting, comparison, installation and offline replay remain unimplemented. Physical-device performance is not yet verified.

## Build contract

Read [the master MVP and roadmap](MENHEL_MOTION_MASTER_MVP.md), [execution evidence](docs/EXECUTION.md), and [agent instructions](AGENTS.md).

## Run

Use Node 24.19.0 and npm 11.9.0.

```sh
npm ci
npm run dev
```

Verification uses `npm run lint`, `npm run typecheck`, `npm run build`, and `npm run test:e2e`. Browser binaries can be prepared with `npx playwright install chromium`.

See [the phone test checklist](docs/DEVICE_CHECKLIST.md) before claiming camera compatibility. The build prepares checksum-verified model/WASM assets; the initial build needs access to the official model download.

## Provenance

The original 47-file Menhel import is preserved under `legacy/menhel/`. The original repository remains unchanged. [Hash manifest](docs/import-provenance.json). Event code-reuse eligibility remains unresolved.
