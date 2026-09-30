# EventWeave

> Project status: feature-complete on the final closeout branch. Core import, timeline, comparison, findings, report export, filtering, and local investigation persistence are integrated. The closeout review must merge into `sep_release` before the user-approved monthly promotion PR into `main`.

EventWeave is a privacy-first workflow trace explorer for front-end engineers. It turns JSON or newline-delimited event logs into an interactive view of user journeys, state transitions, latency, and failure clusters without uploading product telemetry to an external service.

## Why It Is Useful

Debugging a multi-step browser workflow often means switching between console output, network traces, screenshots, and loosely structured notes. Raw logs preserve detail but hide causality: an engineer can see that an error occurred without quickly understanding which earlier action or state transition made it likely.

EventWeave provides a focused local analysis workspace. A developer can import a sanitized trace, inspect its timeline, follow causal relationships, compare successful and failed sessions, and export a concise debugging report for an issue or pull request.

## Target Users

- Front-end engineers debugging complex user journeys.
- QA and product engineers comparing successful and failed sessions.
- Teams that cannot send internal telemetry to a third-party analysis service.
- Developers who need reproducible evidence for bugs, performance work, and code reviews.

## Core Features

- Import validated JSON and NDJSON traces with a [documented sample schema](./docs/trace-format.md).
- Normalize events into sessions, spans, actors, state transitions, and relationships.
- Explore a zoomable timeline with latency and error emphasis.
- Follow causal chains between user actions, requests, state changes, and failures.
- Filter by session, event type, actor, duration, and outcome.
- Compare a successful trace with a failed trace to surface the first meaningful divergence.
- Run transparent local heuristics for slow spans, repeated failures, and missing completion events.
- Save analysis state locally and export a Markdown debugging report.
- Include accessible table alternatives for every graphical view.

## Technology

- React and TypeScript for a typed interactive analysis workspace.
- Vite for local development and production builds.
- A dedicated Web Worker boundary for parsing without blocking future interactions.
- IndexedDB for local traces and saved investigations later in the build.
- A versioned, runtime-validated investigation snapshot contract keeps future IndexedDB storage separate from React and imported trace contents.
- Vitest for parser, normalization, worker-contract, comparison, and heuristic tests.
- SVG with focused utility functions for the first timeline and causal graph.

## Getting Started

```bash
cd eventweave
npm install
npm run dev
```

Quality commands:

```bash
npm run lint
npm test
npm run build
```

## Current Implementation

The current Atlas and Lumen increments establish a tested core contract and the first usable local-import workflow:

- A versioned product-neutral event model with narrow primitive attributes.
- A shared parser for JSON envelopes and line-aware NDJSON.
- Transactional validation for field types, limits, duplicate IDs, and missing parent relations.
- Deterministic session, event, outcome, duration, and causal-relation normalization.
- Same-session, time-consistent, acyclic parent-link enforcement before causal evidence is accepted.
- A deterministic causal-chain selector that separates explicit parent evidence from timeline sequence context.
- A deterministic finding engine for slow spans, repeated failures, and missing completion signals, with configurable thresholds, explicit uncertainty, and stable event IDs for later UI selection.
- An integrated findings review panel with an accessible severity filter, live counts, honest empty states, and evidence controls that clear only filters hiding their selected event.
- A typed worker request/response contract and module worker entry.
- A pure composable event-filter model for exact actor, type, outcome, and inclusive minimum-duration refinement while preserving canonical order.
- A shared accessible filter panel narrows both the timeline and semantic table, preserves canonical step numbers, handles empty results, and reveals cross-view jump targets.
- A worker-backed select-or-drop import panel with stale-result suppression, failure recovery, and a semantic session summary.
- A pure bounded timeline view model plus session navigation, roving keyboard event selection, synchronized evidence details, and a scroll-contained semantic table alternative.
- Selected-event causal context powered by the explicit-parent selector, with branched downstream evidence presented without implying a false linear path.
- A deterministic session-alignment engine that reports match basis, confidence, unmatched events, and the first meaningful divergence.
- A baseline-versus-candidate comparison workflow with separate local imports, session selection, confidence, an aligned semantic table, and timeline jump-back controls.
- A safe local Markdown debugging report covering the selected event, explicit causal context, full session timeline, and active comparison evidence.
- Accessible investigation controls save, list, restore, and remove trace-bound session, event, and filter context in IndexedDB without persisting imported trace contents.
- Successful and failed checkout fixtures that model the same realistic journey.
- A second JSON failure fixture models a profile save rejected by an unavailable service, with a parser test confirming the recorded failure and recovery sequence.
- A responsive, accessible React workspace that communicates the local-only product promise.

```mermaid
flowchart LR
    File["Local JSON / NDJSON"] --> Limits["Size + event limits"]
    Limits --> Parse["Shared parser"]
    Parse --> Guard["Event + relation guards"]
    Guard --> Integrity["Causal integrity"]
    Integrity -->|all valid| Normalize["Canonical trace"]
    Guard -->|any invalid| Errors["Actionable errors"]
    Integrity -->|any invalid| Errors
    Normalize --> ImportUI["Import state + summary"]
    Normalize --> TimelineVM["Timeline view model"]
    TimelineVM --> TimelineUI["Keyboard timeline + table"]
    TimelineUI --> CausalUI["Selected causal evidence"]
    Normalize --> Compare["Session alignment"]
    Normalize --> Findings["Transparent finding rules"]
    ImportUI --> UI["Exploration workspace"]
    CausalUI --> UI
    Compare --> UI
    Findings --> UI
```

## Investigation Service Boundary

Atlas's closeout service composes the runtime-validated snapshot contract with the IndexedDB adapter without exposing serialized storage data to React. Save injects an ID and timestamp, list returns compact summaries, restore returns only the validated selection and copied filters, and remove delegates storage deletion. Imported trace contents remain in memory and are never written into an investigation snapshot.

Validation and storage failures pass through unchanged, so UI controls cannot receive partial restore state. Focused tests cover generated metadata, summary privacy, restore mapping, error propagation, and deletion delegation. A complete service-to-IndexedDB journey test saves the failed checkout selection and filters, lists and restores them, then confirms the same snapshot cannot be applied to the successful trace.

The current Lumen controls expose this boundary without serialized storage details. Restore validates that the saved filters still reveal the saved event before React applies session, filters, and selection together, then moves focus to the selected evidence. Removal requires an explicit second action. Pending, success, validation, and storage outcomes use one polite live status; all controls remain at least 44 px high and fit a 390 px viewport.

## Project Structure

```text
eventweave/
  docs/
    architecture.md
    handoffs/
      2026-09-14-atlas-findings.md
    trace-format.md
  public/samples/
    checkout-success.json
    checkout-failure.ndjson
  src/
    app/
    lib/
      trace-model.ts
      trace-parser.ts
      trace-parser.test.ts
      trace-findings.ts
      trace-findings.test.ts
    styles/
    workers/
      trace-import-contract.ts
      trace-import.worker.ts
  README.md
```

## Delivery Plan and Closeout

1. **Complete:** trace format, application scaffold, fixtures, validated local import, and first-divergence comparison foundation.
2. **Complete:** session navigation, an accessible event timeline/table, and synchronized causal context.
3. **Complete:** explicit causal-chain selection, transparent finding rules, and integrated evidence-selection controls.
4. **Complete:** comparison workflow UI on the implemented first-divergence engine.
5. **Complete:** validated snapshot contract, IndexedDB adapter, service, and save/list/restore/remove controls.
6. **Complete:** Markdown reporting, a second failure fixture, and end-to-end browser checks.
7. **Complete on the closeout branch:** responsive/accessibility review, [retrospective](./docs/retrospective.md), and the written [TraceRelay proposal](../docs/proposals/tracerelay.md). Release review remains.

## Lumen handoff to Atlas

- Branch: `codex/lumen-eventweave-closeout` from `sep_release` after PR #19 merged.
- Completed: mounted findings, preserved compatible filters when revealing evidence, strengthened replacement-trace snapshot isolation, and recorded the retrospective plus next-project proposal.
- Open risks: the closeout PR and the later `sep_release` to `main` promotion PR still require user review. No product-scope work remains.
- Next distinct task: Atlas should perform a release-only audit of `sep_release` after this PR merges; do not add features or begin TraceRelay without explicit approval.
