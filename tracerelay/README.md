# TraceRelay

TraceRelay is a privacy-first local capture companion for EventWeave. A developer will explicitly start one bounded browser capture, reproduce a workflow, review the approved and protected fields locally, then export an EventWeave-compatible JSON or NDJSON file for manual upload.

The approved version-one boundary is intentionally narrow: no invisible production recording, automatic upload, monitoring backend, trace-ID lookup, proprietary log links, company data, or arbitrary DOM capture.

## Version-one result

The product experience now connects the protected capture core to an explicit synthetic demo. It provides:

- a responsive review workspace with a summary of events, actors, types, and protected fields;
- an ordered, keyboard-operable event sequence and synchronized selected-event details;
- explicit allowed, masked, and removed attribute treatments;
- visible start/stop state and separate successful and failed profile-save journeys;
- human-confirmed JSON and NDJSON downloads for manual EventWeave upload;
- tested browser-download orchestration with temporary URL cleanup and actionable permission-failure feedback;
- an executable compatibility contract that imports generated JSON and NDJSON through EventWeave and proves identical event order, parent links, and protected values;
- accessible status announcements, locked controls outside valid lifecycle states, and responsive 44 px controls;
- server-rendered accessibility coverage plus journey, privacy, filename, export, browser-boundary, and cross-project compatibility tests.

Atlas's first core increment now provides the non-visual recording boundary behind that review:

- explicit `start`, `record`, and `stop` lifecycle states with stable trace, session, and event identifiers;
- a hard event-count limit that rejects new evidence instead of evicting accepted parents;
- product-neutral, parent-linked event inputs aligned with EventWeave's version-one contract;
- default-deny attribute protection, configurable masking, and unconditional removal of sensitive keys;
- isolated review snapshots plus deterministic EventWeave-compatible JSON and NDJSON serialization;
- focused lifecycle, validation, privacy, ordering, compatibility, and size-limit tests.

No recording occurs automatically. Starting a new capture clears the prior generated journey, the user chooses one synthetic outcome, and export remains unavailable until that capture is explicitly stopped.

Version one is feature-complete on `oct_release`. See [the closeout review](./docs/closeout.md) for the completed scope, final browser regression, retrospective, deferred ideas, and release boundary.

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

The current locked dependency graph reports zero known npm audit vulnerabilities. TraceRelay uses Vitest 5 and Vite 7.3.7, including the fixed Windows development-server boundary.

See [architecture.md](./docs/architecture.md) for the approved boundaries and current data flow.
