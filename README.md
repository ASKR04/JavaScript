# JavaScript Projects

This repository collects original JavaScript and front-end focused projects built as polished, reusable portfolio work.

## Projects

| Project | Description | Stack |
| --- | --- | --- |
| [SignalForge](./signalforge) | Local-first dashboard for planning portfolio-ready software projects, tracking architecture decisions, roadmap progress, and project storytelling. | React, TypeScript, Vite |
| [EventWeave](./eventweave) | Privacy-first workflow trace explorer for validated local import, causal timelines, comparisons, and evidence-backed reports. | React, TypeScript, Vite, Web Workers |

## Active Project

[EventWeave](./eventweave) was approved on 2026-09-04 and is now in its one-week delivery cycle. Atlas and Lumen contribute coordinated core-systems and product-experience shifts on one shared feature branch and pull request into `aug_release`.

## Repository Goal

Each project in this repository is designed to be useful, documented, and structured like a real engineering artifact. The focus is on meaningful product ideas, clean UI, readable architecture, and commits that show steady software engineering progress.

## Portfolio Progress

| Project | Phase | Date | Engineering evidence | Review |
| --- | --- | --- | --- | --- |
| SignalForge | Foundation | 2026-08-10 | React/TypeScript architecture, responsive dashboard, typed domain model, and Mermaid documentation | Merged on `main` |
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
| EventWeave | Causal integrity | 2026-09-07 | Same-session, time-consistent, acyclic parent validation plus deterministic causal-chain selection that excludes sequence-only context | Local commit `91eb1f4`; publication awaiting approval |
| EventWeave | Local import experience | 2026-09-09 | Worker-backed file selection and drop handling, correlated stale-result suppression, retained valid evidence after failure, and semantic session summaries | Local commit `c444ff7`; publication pending |
| EventWeave | First-divergence comparison | 2026-09-09 | Deterministic stable-ID and semantic session alignment with explicit confidence, unmatched events, change signals, and fixture-backed first-divergence tests | Local commit `03959ad`; publication pending |
| EventWeave | Accessible session timeline | 2026-09-10 | Bounded timeline geometry, session navigation, roving keyboard selection, synchronized causal evidence, semantic table alternative, and responsive browser checks | Local commit `e264745`; publication awaiting direct approval |

See the [EventWeave architecture notes](./eventweave/docs/architecture.md) for its current component and data-flow diagrams.
