# SignalForge

SignalForge is a local-first planning dashboard for developers who want to turn project ideas into well-structured, portfolio-ready software. It helps connect the parts that usually live in separate places: product purpose, feature scope, architecture decisions, implementation progress, commit notes, and final project storytelling.

The goal is simple: help a developer build projects with enough clarity that the code, documentation, and Git history all explain the same engineering story.

## Problem

Many portfolio projects start with energy but lose shape over time. Requirements drift, architecture decisions are forgotten, commit messages become random, and the final README often gets written after the project is already finished.

SignalForge treats documentation and execution as part of the same workflow. A project begins with a clear brief, grows through feature planning and decision records, and ends with a useful summary that can be reused in a GitHub README, resume note, or portfolio case study.

## Core Features

- Project brief for defining the problem, audience, value, and success criteria.
- Roadmap workspace for breaking work into focused milestones.
- Feature board for tracking planned, active, blocked, and completed work.
- Validated feature and milestone creation with safe, confirmed removal.
- Versioned local persistence with autosave feedback and safe sample reset.
- Portable JSON workspace backups with schema validation and version-one migration on restore.
- Commit narrative planner for shaping daily implementation notes into conventional commit messages and durable verification evidence.
- Editable architecture decision records for capturing technical choices and tradeoffs.
- Portfolio summary for collecting highlights, proof points, and final documentation notes.
- Portable Markdown project-story export with completion metrics, safe filenames, clipboard sharing, and local download.
- Portfolio-readiness scoring that surfaces incomplete scope, roadmap, architecture, and delivery evidence before publication.

## Architecture

```mermaid
flowchart LR
    User["Developer"] --> App["SignalForge App"]
    App --> Dashboard["Dashboard"]
    App --> Roadmap["Roadmap"]
    App --> Decisions["Architecture Decisions"]
    App --> Commits["Commit Narrative Planner"]
    App --> Summary["Portfolio Summary"]
    Dashboard --> Store["Project State"]
    Roadmap --> Store
    Decisions --> Store
    Commits --> Store
    Summary --> Store
    Store --> Persistence["Local Persistence"]
    Persistence --> Browser["Browser Storage"]
```

## Data Flow

```mermaid
sequenceDiagram
    participant Developer
    participant Interface
    participant State
    participant Storage

    Developer->>Interface: updates a project plan
    Interface->>State: applies a typed state change
    State->>State: validates project structure
    State->>Storage: saves the workspace locally
    State-->>Interface: returns the updated project view
```

## Tech Stack

- React for the user interface.
- TypeScript for predictable application state and safer refactoring.
- Vite for development and build tooling.
- CSS for a custom responsive interface.
- Browser storage for the first local-first version.
- Vitest for state and utility tests as the app logic grows.

## Planned Application Structure

```text
src/
  app/
    App.tsx
    routes.ts
  components/
    AppShell.tsx
    StatusBadge.tsx
    Toolbar.tsx
  features/
    dashboard/
    roadmap/
    decisions/
    summary/
  lib/
    persistence.ts
    project-state.ts
    validation.ts
  styles/
    global.css
```

## Design Principles

- Keep the interface useful on day one, even before external integrations exist.
- Favor clear project evidence over decorative metrics.
- Make project planning feel like engineering work, not administration.
- Keep state local-first so the app remains fast and private.
- Document important tradeoffs as the product evolves.

## Status

SignalForge now supports an editable project brief, custom feature and milestone creation, status controls, confirmed removal, debounced browser persistence, save-state feedback, and a safe reset flow. Its architecture decision log supports validated creation, focused edits, stable human-readable ADR identifiers, and confirmed removal. Creation forms reject incomplete and duplicate records, while roadmap numbering stays coherent after removals.

The portfolio summary now turns live workspace evidence into a structured Markdown case study. Users can download a safe project-specific file or copy the story to their clipboard without sending project data to a server. The export covers the product brief, feature and milestone delivery status, architecture decisions, commit narratives, portfolio highlights, and a generation date.

The commit narrative planner connects daily delivery notes to conventional commit subjects, implementation context, and verification proof. Narratives are validated, saved locally, copyable as ready-to-use commit messages, and included in the project-story export. Existing version-one browser snapshots migrate without losing earlier planning work.

Workspace data can now move safely between browsers or machines through a readable JSON backup. Downloads include format, schema, and export metadata; restores reject unrelated, malformed, incomplete, or future-version files before asking the user to replace local state. Version-one backups migrate through the same tested boundary as browser persistence.

The finished workflow now closes the loop between planning and publication. A tested readiness model checks the project brief, feature delivery, roadmap closure, architecture decisions, and commit evidence. The Summary view presents the result as an accessible progress indicator and actionable checklist before a developer exports the final project story.

Keyboard navigation now includes a first-focus bypass link into the project workspace, high-contrast focus indicators for sidebar navigation and form controls, and a visible focus destination after the bypass. Smooth scrolling and readiness animation are disabled when the operating system requests reduced motion.

Validated creation and editing forms now recover predictably from errors. A live summary announces how many fields need attention, then focus moves to the first invalid control in reading order after its field-level guidance is rendered. Successful feature, milestone, and decision creation returns focus to the first field for efficient repeated entry.

Local persistence now protects edits that are still inside the autosave debounce window. A shared coordinator coalesces rapid changes, reports storage failures through the existing save status, and flushes the newest pending workspace when the page is hidden so a quick tab close or navigation does not discard the last input.

## Retrospective

SignalForge began as a static planning dashboard and finished as a private, portable workspace with explicit boundaries between typed domain logic, React interaction code, browser persistence, and export adapters. The most effective decision was keeping validation and state transitions framework-independent: this made features such as backup migration, story export, and readiness scoring straightforward to test without browser mocks.

The week also exposed a useful product lesson. Capturing evidence is not the same as knowing work is ready to publish. The final readiness checklist turns the data already present in the workspace into a clear release decision, rather than adding another disconnected form. A future version could replace browser storage with an optional synchronized adapter, but the local-first core is complete and useful without accounts or external services.

## Progress Log

| Phase | Date | Completed | Verification | Review |
| --- | --- | --- | --- | --- |
| Foundation | 2026-08-10 | Proposed the architecture, scaffolded the React/TypeScript app, and built the responsive dashboard views. | Production build | Merged on `main` |
| Editable workspace | 2026-08-10 | Added editable brief fields, workflow status controls, versioned local autosave, reset behavior, and state/persistence tests. | 4 Vitest tests, production build, desktop and 390px responsive checks | [PR #1](https://github.com/ASKR04/JavaScript/pull/1) |
| Plan composition | 2026-08-11 | Added validated feature and milestone creation, stable IDs, confirmed removal, and automatic roadmap resequencing. | 6 Vitest tests, production build, 1440px desktop and 390px responsive checks | [PR #1](https://github.com/ASKR04/JavaScript/pull/1) |
| Decision log | 2026-08-12 | Added validated ADR creation, editable decision cards, stable ADR sequences, confirmed removal, and autosaved immutable state transitions. | 8 Vitest tests, production build, 1440px desktop and 390px interaction checks | [PR #1](https://github.com/ASKR04/JavaScript/pull/1) |
| Project story export | 2026-08-13 | Added deterministic Markdown generation, live evidence metrics, safe filenames, browser download, clipboard sharing, and accessible feedback. | 11 Vitest tests, production build, 1440px desktop and 390px responsive interaction checks | [PR #1](https://github.com/ASKR04/JavaScript/pull/1) |
| Commit narrative planner | 2026-08-14 | Added conventional commit composition, subject-length guidance, implementation and verification evidence, version-one storage migration, clipboard handoff, and project-story integration. | 14 Vitest tests, production build, desktop and mobile responsive checks | [PR #1](https://github.com/ASKR04/JavaScript/pull/1) |
| Workspace portability | 2026-08-15 | Added readable JSON backup downloads, validated restore confirmation, shared schema migration, safe filenames, and accessible transfer feedback. | 20 Vitest tests, production build, desktop and 390px restore interaction checks | [PR #1](https://github.com/ASKR04/JavaScript/pull/1) |
| Portfolio closeout | 2026-08-17 | Added pure readiness scoring, an accessible completion checklist, final responsive polish, finished-workflow documentation, and the EventWeave proposal. | 24 Vitest tests, production build, local-server smoke check, and responsive CSS/accessibility review | [PR #3](https://github.com/ASKR04/JavaScript/pull/3) |
| Accessibility maintenance | 2026-08-18 | Added a keyboard bypass path, visible navigation and control focus states, and reduced-motion behavior. | 24 Vitest tests, production build, and source-level accessibility review | [PR #4](https://github.com/ASKR04/JavaScript/pull/4) |
| Validation recovery | 2026-08-19 | Added ordered first-error focus recovery and live error-count summaries across feature, milestone, decision, and commit forms. | 27 Vitest tests, production build, HTTP smoke check, and semantic source review | [PR #4](https://github.com/ASKR04/JavaScript/pull/4) |
| Autosave resilience | 2026-08-20 | Added coalesced save scheduling and lifecycle flushing so pending edits survive quick tab exits. | 30 Vitest tests, production build, lifecycle unit coverage, and HTTP 200 smoke check | [PR #4](https://github.com/ASKR04/JavaScript/pull/4) |
