# JavaScript Projects

This repository collects original JavaScript and front-end focused projects built as polished, reusable portfolio work.

## Projects

| Project | Description | Stack |
| --- | --- | --- |
| [SignalForge](./signalforge) | Local-first dashboard for planning portfolio-ready software projects, tracking architecture decisions, roadmap progress, and project storytelling. | React, TypeScript, Vite |
| [EventWeave](./eventweave) | Privacy-first workflow trace explorer for validated local import, causal timelines, comparisons, and evidence-backed reports. | React, TypeScript, Vite, Web Workers |
| [TraceRelay](./tracerelay) | Privacy-first local capture companion for reviewing and exporting EventWeave-compatible traces. | React, TypeScript, Vite |
| [IncidentLens](./incidentlens) | Evidence-first synthetic incident triage that correlates explicit signals with citations, confidence, and missing-evidence disclosure. | React, TypeScript, Vite |

## Active Project

[EventWeave](./eventweave) was promoted to `main` through PR #21 after its final closeout review. [TraceRelay](./tracerelay) was explicitly approved on 2026-09-29 and completed its version-one scope as a local, manual-export capture companion. [IncidentLens](./incidentlens) begins with public synthetic adapter contracts and deterministic evidence correlation; real connectors, company data, and VDI data are outside the approved foundation.

## Repository Goal

Each project in this repository is designed to be useful, documented, and structured like a real engineering artifact. The focus is on meaningful product ideas, clean UI, readable architecture, and commits that show steady software engineering progress.

## Portfolio Progress

| Project | Phase | Date | Engineering evidence | Review |
| --- | --- | --- | --- | --- |
| IncidentLens | Local import workflow | 2026-10-29 | Explicit local JSON selection, bounded validation before correlation, complete issue disclosure, cancel/retry recovery, unchanged-investigation safety, and responsive accessible states | Quinn branch `codex/quinn-incidentlens-local-import`; November release PR deferred until dependencies enter `nov_release` |
| IncidentLens | Synthetic import boundary | 2026-10-29 | Bounded default-deny JSON parsing, synthetic-only ticket identifiers, timestamp and enum validation, sensitive/unknown-field rejection, cross-record reference checks, and focused tests | Nova branch `codex/nova-incidentlens-synthetic-import`; November release PR deferred until `nov_release` exists |
| IncidentLens | Investigation workflow | 2026-10-28 | Responsive ownership path, filterable evidence timeline, selected citation details, confidence and missing-evidence disclosure, triage-not-diagnosis language, and review-gated local report | Quinn branch `codex/quinn-incidentlens-investigation-ui`; November release PR deferred until `nov_release` exists |
| IncidentLens | Evidence foundation | 2026-10-28 | Synthetic ticket/trace/log/change/ownership contracts, deterministic earliest-abnormal correlation, topology-backed location, citations, confidence, missing evidence, fixtures, and tests | Nova branch `codex/nova-incidentlens-evidence-foundation`; November release PR deferred until `nov_release` exists |
| TraceRelay | Version-one closeout | 2026-10-26 | Completed scope checklist, success/failure browser regression, keyboard review, JSON/NDJSON download confirmation, 390 × 844 containment, clean logs, and retrospective | Lumen branch `codex/lumen-tracerelay-closeout-review`; review pending |
| TraceRelay | EventWeave compatibility | 2026-10-26 | Generated JSON/NDJSON parsed by EventWeave with identical normalized order and parents; masked values preserved and credentials excluded | [PR #26](https://github.com/ASKR04/JavaScript/pull/26) merged into `oct_release` |
| TraceRelay | Export reliability | 2026-10-25 | Testable browser-download boundary, deterministic anchor lifecycle, temporary URL revocation, and actionable permission-failure status | [PR #25](https://github.com/ASKR04/JavaScript/pull/25) merged into `oct_release` |
| TraceRelay | Recording and export workflow | 2026-10-20 | Visible start/stop lifecycle, instrumented success/failure journeys, protected review, safe JSON/NDJSON download, accessible status, responsive browser checks, and security-updated Vite | [PR #24](https://github.com/ASKR04/JavaScript/pull/24) merged into `oct_release` |
| TraceRelay | Capture core | 2026-10-07 | Explicit bounded lifecycle, stable identifiers, default-deny privacy protection, parent validation, isolated review snapshots, and deterministic EventWeave JSON/NDJSON | Atlas [PR #23](https://github.com/ASKR04/JavaScript/pull/23) merged into `oct_release` |
| TraceRelay | Capture review foundation | 2026-09-30 | Responsive protected-event review, privacy-treatment details, honest export boundary, synthetic fixture, and accessibility contracts | [PR #22](https://github.com/ASKR04/JavaScript/pull/22) merged into `oct_release` |
| EventWeave | Event filter model | 2026-09-14 | Composable actor, type, outcome, and inclusive duration predicates with canonical ordering, sorted options, missing-duration semantics, and focused tests | [PR #10](https://github.com/ASKR04/JavaScript/pull/10) merged into `sep_release` |
| EventWeave | Investigation snapshot contract | 2026-09-15 | Versioned, bounded, trace-bound snapshots with runtime validation and stale-selection rejection; storage and UI remain pending | [PR #11](https://github.com/ASKR04/JavaScript/pull/11) merged into `sep_release` |
| EventWeave | Cross-feature journey tests | 2026-09-21 | Checkout fixtures exercised through import, timeline, causal analysis, comparison, reporting, findings, and investigation restore | [PR #12](https://github.com/ASKR04/JavaScript/pull/12) merged into `sep_release` |
| EventWeave | Accessible findings panel | 2026-09-21 | Tested standalone findings presentation with evidence-selection controls; explorer mounting remains | [PR #13](https://github.com/ASKR04/JavaScript/pull/13) merged into `sep_release` |
| EventWeave | Browser investigation store | 2026-09-21 | IndexedDB save/load/list/remove adapter with trace-bound validation and focused tests; save/restore UI remains | [PR #14](https://github.com/ASKR04/JavaScript/pull/14) merged into `sep_release` |
| EventWeave | Filter interface and second failure fixture | 2026-09-21 | Shared timeline/table filtering, explicit empty state, and profile-save failure sample with parser coverage | [PR #15](https://github.com/ASKR04/JavaScript/pull/15) merged into `sep_release` |
| EventWeave | Findings severity review | 2026-09-24 | Accessible severity filtering linked to controlled results and live status, filtered-empty guidance, and 44 px evidence actions | [PR #17](https://github.com/ASKR04/JavaScript/pull/17) merged into `sep_release` |
| SignalForge | Foundation | 2026-08-10 | React/TypeScript architecture, responsive dashboard, typed domain model, and Mermaid documentation | Merged on `main` |
| EventWeave | Investigation persistence contract | 2026-09-15 | Versioned bounded snapshots, deterministic trace fingerprints, runtime shape validation, stale-selection rejection, and storage-independent round trips | Atlas branch `codex/atlas-eventweave-investigation-persistence` |
| SignalForge | Editable workspace | 2026-08-10 | Immutable state transitions, versioned browser persistence, runtime data guards, accessible form controls, and Vitest coverage | [PR #1](https://github.com/ASKR04/JavaScript/pull/1) |
| SignalForge | Plan composition | 2026-08-11 | Validated feature and milestone creation, stable IDs, confirmed removal, and deterministic roadmap resequencing | [PR #1](https://github.com/ASKR04/JavaScript/pull/1) |
| SignalForge | Decision log | 2026-08-12 | Validated ADR creation and editing, stable human-readable sequences, confirmed removal, responsive forms, and immutable state tests | [PR #1](https://github.com/ASKR04/JavaScript/pull/1) |
| SignalForge | Project story export | 2026-08-13 | Deterministic Markdown generation, evidence metrics, safe filenames, browser-native download, clipboard sharing, and responsive accessible feedback | [PR #1](https://github.com/ASKR04/JavaScript/pull/1) |
| SignalForge | Commit narrative planner | 2026-08-14 | Conventional commit composition, reviewable implementation notes, verification evidence, storage migration, clipboard handoff, and project-story integration | [PR #1](https://github.com/ASKR04/JavaScript/pull/1) |
| SignalForge | Workspace portability | 2026-08-15 | Versioned JSON backups, migration-safe runtime validation, confirmed restore, safe filenames, accessible feedback, and responsive interaction checks | [PR #1](https://github.com/ASKR04/JavaScript/pull/1) |
| SignalForge | Portfolio closeout | 2026-08-17 | Tested readiness scoring, accessible completion checklist, responsive final review, retrospective, and next-project proposal | [PR #3](https://github.com/ASKR04/JavaScript/pull/3) |
| SignalForge | Accessibility maintenance | 2026-08-18 | Keyboard bypass navigation, high-contrast focus visibility, and reduced-motion support | [PR #4](https://github.com/ASKR04/JavaScript/pull/4) |
| SignalForge | Validation recovery | 2026-08-19 | Tested first-error focus recovery and live summaries across validated planning forms | [PR #4](https://github.com/ASKR04/JavaScript/pull/4) |
| SignalForge | Autosave resilience | 2026-08-20 | Tested coalesced persistence and lifecycle flushing for pending local edits | [PR #4](https://github.com/ASKR04/JavaScript/pull/4) |
| SignalForge | Autosave recovery | 2026-08-21 | Recoverable storage failures with explicit retry, lifecycle retry, and stale-snapshot protection | [PR #4](https://github.com/ASKR04/JavaScript/pull/4) |
| SignalForge | Multi-tab conflict protection | 2026-08-24 | Validated external-save detection, paused local writes, and accessible load-or-keep recovery | [PR #4](https://github.com/ASKR04/JavaScript/pull/4) |
| SignalForge | Tab conflict review | 2026-08-24 | Silent identical-save reconciliation, privacy-preserving conflict summaries, and measured mobile alert containment | [PR #4](https://github.com/ASKR04/JavaScript/pull/4) |
| SignalForge | Reversible workspace replacement | 2026-08-25 | Conflict-safe backup restore and sample reset with autosaved undo/redo recovery | [PR #4](https://github.com/ASKR04/JavaScript/pull/4) |
| SignalForge | Unreadable startup recovery | 2026-08-26 | Typed storage outcomes, paused autosave, raw rescue download, and explicit replacement confirmation | [PR #4](https://github.com/ASKR04/JavaScript/pull/4) |
| SignalForge | Temporary workspace protection | 2026-08-27 | Explicit unavailable-storage state, immediate persistence probe, and tested exit protection for non-durable work | [PR #4](https://github.com/ASKR04/JavaScript/pull/4) |
| SignalForge | Storage access containment | 2026-08-30 | Lazy, retryable browser-storage resolution that contains getter-level privacy and sandbox access failures | [PR #4](https://github.com/ASKR04/JavaScript/pull/4) |
| SignalForge | Conflict-safe continued editing | 2026-08-31 | Tested autosave pause policy that prevents in-tab edits from overwriting an unresolved newer external snapshot | [PR #4](https://github.com/ASKR04/JavaScript/pull/4) |
| SignalForge | Clock-safe tab synchronization | 2026-09-01 | Storage-event ordering, clock-skew conflict coverage, and last-observed external-write retention | [PR #4](https://github.com/ASKR04/JavaScript/pull/4) |
| SignalForge | Stable identity validation | 2026-09-02 | Shared snapshot, backup, and cross-tab guards for blank, padded, and duplicate collection IDs | [PR #4](https://github.com/ASKR04/JavaScript/pull/4) |
| SignalForge | Read-before-write storage recovery | 2026-09-03 | Safe recovery planning that reconciles or reviews existing browser data before any retry write | [PR #4](https://github.com/ASKR04/JavaScript/pull/4) |
| EventWeave | Day 1 core foundation | 2026-09-04 | Versioned trace schema, validated JSON/NDJSON parsing, deterministic normalization, worker boundary, realistic fixtures, and focused tests | Local commit `1464a1e`; publication awaiting approval |
| EventWeave | Transparent trace findings | 2026-09-14 | Deterministic slow-span, repeated-failure, and missing-completion rules with configurable thresholds, honest explanations, stable evidence IDs, and focused positive/negative tests | Atlas commit `5f5d0be`; [PR #9](https://github.com/ASKR04/JavaScript/pull/9) into `sep_release` |
| EventWeave | Causal integrity | 2026-09-07 | Same-session, time-consistent, acyclic parent validation plus deterministic causal-chain selection that excludes sequence-only context | Local commit `91eb1f4`; publication awaiting approval |
| EventWeave | Local import experience | 2026-09-09 | Worker-backed file selection and drop handling, correlated stale-result suppression, retained valid evidence after failure, and semantic session summaries | Local commit `c444ff7`; publication pending |
| EventWeave | First-divergence comparison | 2026-09-09 | Deterministic stable-ID and semantic session alignment with explicit confidence, unmatched events, change signals, and fixture-backed first-divergence tests | Local commit `03959ad`; publication pending |
| EventWeave | Accessible session timeline | 2026-09-10 | Bounded timeline geometry, session navigation, roving keyboard selection, synchronized causal evidence, semantic table alternative, and responsive browser checks | Local commit `e264745`; publication awaiting direct approval |
| EventWeave | Comparison workflow | 2026-09-12 | Separate baseline import, session pairing, confidence, first-divergence evidence, aligned semantic table, and timeline jump-back controls | Lumen branch `codex/lumen-eventweave-compare-workflow` |
| EventWeave | Markdown debugging report | 2026-09-13 | Safe filename generation, escaped imported content, selected causal evidence, full timeline, active comparison, and local-only download | Lumen commit `412b228`; [PR #8](https://github.com/ASKR04/JavaScript/pull/8) into `sep_release` |
| EventWeave | Investigation service boundary | 2026-09-24 | Typed save/list/restore/remove facade plus an IndexedDB-backed journey test that restores selection/filters and rejects a changed trace | [PR #16](https://github.com/ASKR04/JavaScript/pull/16) merged into `sep_release` |
| EventWeave | Investigation controls | 2026-09-29 | Accessible local save/list/restore/remove controls with atomic context restore, trace-content privacy, responsive containment, and live browser verification | Lumen branch `codex/lumen-eventweave-investigation-controls` |
| EventWeave | Portfolio closeout | 2026-09-29 | Integrated findings evidence, compatible-filter reveal behavior, replacement-trace snapshot isolation, final regression, retrospective, and TraceRelay proposal | Lumen branch `codex/lumen-eventweave-closeout` |

See the [EventWeave architecture notes](./eventweave/docs/architecture.md) for its current component and data-flow diagrams.

## Active Review Queue

- TraceRelay version-one closeout: final regression evidence, retrospective, and release boundary on `codex/lumen-tracerelay-closeout-review`.
