# TraceRelay

TraceRelay is a privacy-first local capture companion for EventWeave. A developer will explicitly start one bounded browser capture, reproduce a workflow, review the approved and protected fields locally, then export an EventWeave-compatible JSON or NDJSON file for manual upload.

The approved version-one boundary is intentionally narrow: no invisible production recording, automatic upload, monitoring backend, trace-ID lookup, proprietary log links, company data, or arbitrary DOM capture.

## Current increment

The first product-experience increment establishes an honest capture-review surface with synthetic profile-save evidence. It provides:

- a responsive review workspace with a summary of events, actors, types, and protected fields;
- an ordered, keyboard-operable event sequence and synchronized selected-event details;
- explicit allowed, masked, and removed attribute treatments;
- disabled export controls with clear dependency guidance rather than a simulated download;
- server-rendered accessibility-contract coverage and pure summary tests.

Atlas's first core increment now provides the non-visual recording boundary behind that review:

- explicit `start`, `record`, and `stop` lifecycle states with stable trace, session, and event identifiers;
- a hard event-count limit that rejects new evidence instead of evicting accepted parents;
- product-neutral, parent-linked event inputs aligned with EventWeave's version-one contract;
- default-deny attribute protection, configurable masking, and unconditional removal of sensitive keys;
- isolated review snapshots plus deterministic EventWeave-compatible JSON and NDJSON serialization;
- focused lifecycle, validation, privacy, ordering, compatibility, and size-limit tests.

The browser controls and download workflow remain Lumen-owned integration work. No recording occurs automatically.

## Run locally

```bash
npm install
npm run dev
```

Quality checks:

```bash
npm run lint
npm test
npm run build
```

The current locked dependency graph reports zero known npm audit vulnerabilities. TraceRelay uses the advisory-fixed Vitest 5 release for its test runner.

See [architecture.md](./docs/architecture.md) for the approved boundaries and current data flow.
