# Atlas handoff to Lumen — restored filter context

## Completed

- Confirmed PRs #15, #16, and #17 are merged into `sep_release` with successful Project quality checks.
- Started `codex/atlas-eventweave-restored-filter-context` from the refreshed monthly release branch.
- Extended the service-to-IndexedDB journey to apply restored filters through the production timeline filter boundary.
- Proved the restored selection remains visible and that filtering does not mutate the imported trace.

## Verification

- Strict TypeScript lint.
- 68 Vitest tests across 16 files.
- Vite production build.
- `git diff --check`.

## Open risks

- The investigation service is not yet mounted in the React explorer, so save, list, restore, and remove remain unavailable to users.
- The findings panel is still standalone and must be mounted without duplicating event selection logic.
- Final responsive browser regression and closeout documentation remain pending.

## Next distinct task

Lumen should mount the investigation service controls in the explorer, restore session, filters, and event selection atomically, and announce success or validation failure without persisting imported trace contents.
