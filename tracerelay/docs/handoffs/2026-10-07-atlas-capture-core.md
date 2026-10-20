# Atlas handoff to Lumen — capture core

## Completed

- Added the typed explicit capture lifecycle, stable identifiers, ordered parent validation, and hard event-count boundary.
- Added default-deny attribute protection with configurable masking and unconditional sensitive-key removal.
- Added isolated review projection and deterministic EventWeave-compatible JSON and NDJSON serializers.
- Covered lifecycle, privacy, bounds, validation, ordering, compatibility, and copy isolation with focused tests.

## Lumen next task

Replace the provisional synthetic-only boundary with visible start/stop controls for the instrumented profile demo. Build the review from `CaptureCore.toReview`, keep downloads behind an explicit human review action, and use `toJson` / `toNdjson` only for the selected local capture.

## Open risks

- The browser integration must keep recording state visible and must not attach generic DOM, fetch, or network interceptors.
- Download filenames and browser object-URL cleanup still need a tested UI boundary.
- The synthetic success and failure journeys still need to exercise the core through explicit instrumentation.
