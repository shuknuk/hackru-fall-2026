# Menhel Motion

A new Next.js + MediaPipe PWA for comparing two side-view squat sets with local pose data. The web implementation is in its scaffold milestone. Live tracking, recording, comparison and offline replay are not implemented yet.

## Build contract

Read [the master MVP and roadmap](MENHEL_MOTION_MASTER_MVP.md), [execution evidence](docs/EXECUTION.md), and [agent instructions](AGENTS.md).

## Run

Use Node 24.19.0 and npm 11.9.0.

```sh
npm ci
npm run dev
```

Verification uses `npm run lint`, `npm run typecheck`, `npm run build`, and `npm run test:e2e`. Browser binaries can be prepared with `npx playwright install chromium`.

## Provenance

The original 47-file Menhel import is preserved under `legacy/menhel/`. The original repository remains unchanged. [Hash manifest](docs/import-provenance.json). Event code-reuse eligibility remains unresolved.
