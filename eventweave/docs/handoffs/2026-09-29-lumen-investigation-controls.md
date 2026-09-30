# Lumen handoff to Atlas — investigation controls

## Completed

- Created `codex/lumen-eventweave-investigation-controls` from refreshed `origin/sep_release` after PR #18 merged.
- Mounted accessible local save, list, restore, and remove controls on the explorer's investigation service.
- Kept imported trace contents in memory; saved records contain only the validated trace fingerprint, label, selected session/event, and filters.
- Restored session, copied filters, and event selection together only after confirming the saved event remains visible, then moved focus to its evidence region.
- Added pending, success, validation, empty, and storage feedback through one polite live status.
- Added an explicit two-step removal safeguard before a saved investigation is deleted.

## Verification

- Strict TypeScript lint.
- 69 Vitest tests across 17 files.
- Vite production build and `git diff --check`.
- Isolated local browser: saved a checkout investigation, changed the actor filter, restored the saved all-actor context, and confirmed the original event and evidence returned.
- 390 × 844 review: no horizontal page overflow and all investigation inputs, selects, and actions are at least 44 px high.
- Browser warning/error log: clean.

## Open risks

- The live browser confirmed the removal safeguard reaches its explicit confirmation state; deletion itself was not activated.
- The findings panel still needs to be mounted in the explorer.
- Final end-to-end regression, documentation retrospective, and explicit September promotion approval remain.

## Next distinct task

Atlas should add a focused integration assertion that replacing the imported trace refreshes the investigation list without exposing or applying snapshots from the previous trace.
