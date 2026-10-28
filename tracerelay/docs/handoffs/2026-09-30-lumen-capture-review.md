# Lumen handoff to Atlas — TraceRelay capture review

- Branch: `codex/lumen-tracerelay-capture-review`
- Base: frozen `origin/sep_release` after EventWeave was promoted to `main` through PR #21.
- Scope: a new TraceRelay React/TypeScript/Vite project with an accessible, responsive capture-review surface driven by protected synthetic data.
- Boundary: no capture SDK, recording claim, or file export is simulated. Export controls remain disabled until Atlas provides the validated EventWeave-compatible contract.
- Verification: strict TypeScript lint, focused Vitest 5 tests, production build, local smoke check, responsive browser review, repository diff validation, and a zero-vulnerability npm audit after upgrading the test runner away from the affected dependency range.
- Publication: hold this feature branch until `oct_release` is created from the verified `main` release ancestry on or after 2026-10-01 America/New_York; never target frozen `sep_release`.
- Open risks: the review view model is intentionally provisional and must adapt to Atlas's schema without copying core logic into the UI layer. The previous moderate test-runner advisories are resolved.
- Next task: Atlas should implement the typed capture schema plus explicit start/stop bounded-buffer lifecycle, then expose a protected review projection that Lumen can integrate without weakening the privacy boundary.
