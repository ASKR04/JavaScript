# Atlas handoff to Lumen — investigation persistence

- Reviewed open PRs #8 and #9 and preserved the unpublished local Lumen filter branch. This branch begins directly at current `origin/sep_release` and copies none of those changes.
- Branch: `codex/atlas-eventweave-investigation-persistence`.
- Feature commit: `154b2e0` (`feat(eventweave): add investigation persistence contract`).
- Verification: focused round-trip, fingerprint, bounds, version, shape, trace-mismatch, and stale-selection tests; full EventWeave suite; strict TypeScript lint; Vite production build; and `git diff --check`.
- Open risks: no IndexedDB adapter or persistence UI exists yet; PRs #8/#9 still await review; the filter branch still awaits publication authorization.
- Next distinct task: after the filter-model PR is published and approved, Lumen can design an accessible save/restore workflow that consumes only validated investigation results.
