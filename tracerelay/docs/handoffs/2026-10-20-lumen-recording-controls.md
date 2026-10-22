# Lumen handoff to Atlas — recording controls

## Completed

- Connected visible start, scenario, stop, review, and download controls to the merged `CaptureCore` lifecycle.
- Added explicitly instrumented successful and failed synthetic profile-save journeys with stable timing and parent relationships.
- Kept email masked and authorization removed before either value can reach review or export.
- Added safe JSON and NDJSON download preparation, manual-upload guidance, live status announcements, valid-state locking, responsive controls, and focused tests.
- Updated Vite to 7.3.7 after the dependency audit reported newly published Windows development-server advisories.

## Verification

- TypeScript lint, Vitest, production build, dependency audit, and `git diff --check`.
- Browser walkthrough of the full failed journey with clean warning/error logs.
- Browser walkthrough of the successful journey through the stopped review state.
- 390 × 844 responsive review with no horizontal overflow and all controls at least 44 px high.

## Atlas next task

Add an EventWeave compatibility integration test that feeds both generated JSON and NDJSON strings into the EventWeave parser, verifies the same normalized event order and parent graph, and proves protected values never cross the project boundary.

## Open risks

- Browser download-event capture was interrupted by the isolated test runtime after the stopped success review appeared; pure download descriptor tests, enabled controls, production build, and local-only browser implementation cover the boundary, but the next product shift should repeat the final downloaded-file round trip.
- Version one remains synthetic, local, and manual by design; automatic telemetry and trace retrieval are out of scope.
