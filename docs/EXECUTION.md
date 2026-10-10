# Execution ledger

## M0 constraints — recorded, evidence still pending

Checked October 10, 2026. The official [HackRU Fall 2026 website](https://www.hackru.org/) lists hacking starting Saturday at noon, submissions due Sunday at noon and judging starting Sunday at 1 PM. These are event-local schedule times; interpreting them as America/New_York is a venue-based assumption. At the start of this work, approximately 23 hours remained to the published submission time.

Team limit is four humans. The repository description lists Aditya, Ayra and Kinshuk, a three-person team. Current attendance, physical phones/browser versions and stable demo device remain unconfirmed. Current workspace is Node 24.19.0 and npm 11.9.0. Desktop browser emulation is not physical-device evidence.

The site does not establish the Fall 2026 pre-existing code/AI-use submission policy. No organizer clearance is claimed and no message has been sent. Ask an on-site organizer and record their answer before asserting eligibility. Newly implemented web code is tracked separately from the 47-file historical import. Archiving does not establish eligibility.

Read the master contract, source import and root native guidance. Preserved exact imported bytes under legacy/menhel, including the original README and native agent instructions. docs/import-provenance.json lists each file SHA-256 and size. Original repo unchanged.

## M1 scaffold — in progress

New root Next.js App Router package, strict TypeScript, Tailwind v4, semantic home and session setup shell, scripts and production-browser checks. Archive excluded from TypeScript, ESLint and Vitest. No camera request or invented session metrics.

Dependencies are exact-pinned in package.json and package-lock.json. TypeScript 5.9.3 was selected instead of the newly observed 7.x major to reduce tooling compatibility risk; acceptance still depends on the clean build. Exact Node is recorded in .nvmrc.

Verified: npm ci completed, lint passed with no warnings after config correction, strict typecheck passed, production build generated / and /session, and all 47 archive hashes passed.

The initial build exposed empty root app directories shadowing src/app; these were removed and the correct route inventory verified.

Playwright browser downloads returned unusable zero-size/truncated archives for 1.64.0 and an attempted 1.58.2 fallback, including headless-shell retry. Reverted to the planned 1.64.0 because downgrading did not fix the download. Browser tests remain unverified until a browser can launch.

Pending evidence: browser shell navigation, HTTPS preview and real-phone shell check. Skill references are active project guidance; upstream skill packages have not been installed. SDK/WASM/model checksums and live runtime belong to M2 and are still pending.

## M2–M9

Not started. This scaffold is not an installable/offline PWA or a live pose tracker yet.

## Version decisions

Exact direct package versions, licenses, engines and peer declarations are in dependency-metadata.json, with transitive versions/integrities in package-lock.json. ESLint 10.12.0 caused peer warnings from bundled plugins that only declare support through 9; selected 9.39.5. npm marks 9.39.5 unsupported, so this is an explicitly recorded compatibility compromise pending an upstream plugin upgrade. No peer overrides are used in the selected package.
