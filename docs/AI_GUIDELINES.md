# Active implementation guidance

The master MVP section 4 is the source registry and selection rationale. Root AGENTS.md is the always-active project contract. External skill bundles are not installed yet; their reviewed instructions are applied as references. Do not report them as installed capabilities.

| Reference | Pinned source | Application |
| --- | --- | --- |
| Vercel React best practices | https://github.com/vercel-labs/agent-skills/tree/063bee94c3f4df8453406c830b0a7df0f2860278/skills/react-best-practices | Server Components by default, defer heavy pose code until requested, no render-time browser APIs, cleanup listeners and resources |
| Vercel web design guidelines | https://github.com/vercel-labs/agent-skills/tree/063bee94c3f4df8453406c830b0a7df0f2860278/skills/web-design-guidelines | Semantic links/buttons, visible keyboard focus, accessible labels, mobile layout and honest states |
| Next developer loop | https://github.com/vercel/next.js/tree/d8bfc3c994670c367e6e31853b78f42e8b7fba85/skills | Conditional only; bundled Next documentation first. Do not assume the required MCP/browser tooling is present |
| Playwright CLI guidance | https://github.com/microsoft/playwright/tree/d9f2fd3e2232ace8e317a84eda6cb86e25bcf49c/packages/playwright-core/src/tools/skills/playwright-cli | Production browser evidence, clean contexts, distinguish emulation from physical device tests |

Framework/library sources and package-specific constraints for MediaPipe, Tailwind, IndexedDB/idb, Zod, Vitest, PWA APIs and TypeScript are in master sections 3, 4 and 19. There is no verified official MediaPipe AI skill; use its official web documentation and installed types instead of an unrelated community agent script.

Scaffold review applied the installed Vercel react-best-practices skill: pages are Server Components, imports are named, no camera or storage side effects run during render, decorative icons are hidden from assistive technology, headings and navigation are semantic, and focus and skip navigation are present. Runtime verification follows the Vercel verification skill. Their review does not prove real-device suitability.

### ElevenLabs narration references — October 11, 2026

- Official skill source: https://github.com/elevenlabs/skills/blob/main/text-to-speech/SKILL.md (reviewed as reference; no installer run).
- Model documentation: https://elevenlabs.io/docs/overview/models
- Voice inventory: https://elevenlabs.io/docs/api-reference/voices/search
- TTS API: https://elevenlabs.io/docs/api-reference/text-to-speech/convert
- Regenerate the fixed, evidence-based clips with `node scripts/generate-narration.mjs` only when intentionally spending generation credits. Keep `ELEVENLABS_API_KEY` server/local-only; no `NEXT_PUBLIC_` key.
