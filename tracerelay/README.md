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

The capture SDK, bounded buffer, identifiers, validated export contract, and real recording controls remain Atlas-owned core work.

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

See [architecture.md](./docs/architecture.md) for the approved boundaries and current data flow.
