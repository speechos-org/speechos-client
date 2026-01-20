---
"@speechos/client": patch
---

Fixed ESM build for proper browser compatibility:

- Changed `sideEffects` to `true` to preserve custom element registration
- Switched ESM build from tsdown to Rollup for proper TypeScript decorator compilation
- Bundled Lit into ESM output to avoid version conflicts when used with Vite
