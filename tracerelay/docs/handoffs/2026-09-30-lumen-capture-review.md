# Lumen handoff to Atlas — TraceRelay capture review

- Branch: `codex/lumen-tracerelay-capture-review`
- Base: frozen `origin/sep_release` after EventWeave was promoted to `main` through PR #21.
- Scope: a new TraceRelay React/TypeScript/Vite project with an accessible, responsive capture-review surface driven by protected synthetic data.
- Boundary: no capture SDK, recording claim, or file export is simulated. Export controls remain disabled until Atlas provides the validated EventWeave-compatible contract.
- Verification target: strict TypeScript lint, focused Vitest tests, production build, local smoke check, responsive browser review, and repository diff validation.
- Publication: hold this feature branch until `oct_release` is created from the verified `main` release ancestry on or after 2026-10-01 America/New_York; never target frozen `sep_release`.
- Open risks: the review view model is intentionally provisional and must adapt to Atlas's schema without copying core logic into the UI layer.
- Next task: Atlas should implement the typed capture schema plus explicit start/stop bounded-buffer lifecycle, then expose a protected review projection that Lumen can integrate without weakening the privacy boundary.
