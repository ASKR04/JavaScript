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
- Commit planner for shaping daily engineering progress into meaningful commit messages.
- Editable architecture decision records for capturing technical choices and tradeoffs.
- Portfolio summary for collecting highlights, proof points, and final documentation notes.
- Portable Markdown project-story export with completion metrics, safe filenames, clipboard sharing, and local download.

## Architecture

```mermaid
flowchart LR
    User["Developer"] --> App["SignalForge App"]
    App --> Dashboard["Dashboard"]
    App --> Roadmap["Roadmap"]
    App --> Decisions["Architecture Decisions"]
    App --> Summary["Portfolio Summary"]
    Dashboard --> Store["Project State"]
    Roadmap --> Store
    Decisions --> Store
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

The portfolio summary now turns live workspace evidence into a structured Markdown case study. Users can download a safe project-specific file or copy the story to their clipboard without sending project data to a server. The export covers the product brief, feature and milestone delivery status, architecture decisions, portfolio highlights, and a generation date.

The next proof point is a commit narrative planner that connects daily implementation notes to reusable project evidence.

## Progress Log

| Phase | Date | Completed | Verification | Review |
| --- | --- | --- | --- | --- |
| Foundation | 2026-08-10 | Proposed the architecture, scaffolded the React/TypeScript app, and built the responsive dashboard views. | Production build | Merged on `main` |
| Editable workspace | 2026-08-10 | Added editable brief fields, workflow status controls, versioned local autosave, reset behavior, and state/persistence tests. | 4 Vitest tests, production build, desktop and 390px responsive checks | [PR #1](https://github.com/ASKR04/JavaScript/pull/1) |
| Plan composition | 2026-08-11 | Added validated feature and milestone creation, stable IDs, confirmed removal, and automatic roadmap resequencing. | 6 Vitest tests, production build, 1440px desktop and 390px responsive checks | [PR #1](https://github.com/ASKR04/JavaScript/pull/1) |
| Decision log | 2026-08-12 | Added validated ADR creation, editable decision cards, stable ADR sequences, confirmed removal, and autosaved immutable state transitions. | 8 Vitest tests, production build, 1440px desktop and 390px interaction checks | [PR #1](https://github.com/ASKR04/JavaScript/pull/1) |
| Project story export | 2026-08-13 | Added deterministic Markdown generation, live evidence metrics, safe filenames, browser download, clipboard sharing, and accessible feedback. | 11 Vitest tests, production build, 1440px desktop and 390px responsive interaction checks | [PR #1](https://github.com/ASKR04/JavaScript/pull/1) |
