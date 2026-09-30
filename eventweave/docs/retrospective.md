# EventWeave retrospective

## Outcome

EventWeave finished as a local-first workflow trace explorer that turns validated JSON or NDJSON into a synchronized timeline, semantic table, causal context, success-versus-failure comparison, transparent findings, local investigation snapshots, and Markdown reports. Imported trace contents stay in the browser and are never written to IndexedDB or sent to an application server.

## What worked

- Keeping parsing, normalization, comparison, findings, filtering, reporting, and persistence contracts outside React made the core behavior deterministic and inexpensive to test.
- Stable event IDs allowed the timeline, table, comparison, findings, report, and saved investigations to share one evidence-selection model.
- Pairing visual views with semantic tables and live status messages made accessibility part of the architecture rather than a final correction.
- Separate Atlas and Lumen branches kept core-system and product-experience increments reviewable through the monthly release branch.

## What changed during delivery

The original one-week target was missed. The project spent too long with complete foundations waiting for UI integration and review. The recovery strategy—small independent PRs, explicit named handoffs, and a single `sep_release` integration branch—reduced conflicts, but it should have been established on day one.

The scope also became clearer through use. EventWeave can identify where a recorded journey first diverged and what the customer experienced, but it cannot create telemetry, fetch an arbitrary trace ID, or jump to proprietary source code and backend logs without an application-specific adapter. Those are boundaries, not hidden promises.

## Release decision

The approved EventWeave scope is complete once this closeout branch is merged into `sep_release`. Further EventWeave work should be treated as maintenance or a separately approved enhancement. Promotion from `sep_release` to `main` remains a user-reviewed pull request and is never merged automatically.
