# IncidentLens

IncidentLens is an evidence-first incident triage prototype. It accepts public synthetic ticket, trace/span, log, deployment, configuration, and service-ownership records; finds the earliest **explicitly abnormal** event; and explains whether that event is local, upstream, downstream, or impossible to place with the supplied evidence.

The result is a review lead, not a root-cause verdict. Every conclusion carries citations, confidence, and missing-evidence details. This foundation contains no real connectors, production telemetry, company data, or VDI data.

## Run locally

```bash
npm install
npm run dev
```

Quality commands: `npm run lint`, `npm test`, `npm run build`, and `npm audit`.

## Current scope

- Typed synthetic adapter contracts and in-memory mock adapter.
- Deterministic correlation across explicit abnormal trace, log, deployment, and configuration signals.
- Ownership-backed local/upstream/downstream classification.
- Evidence citations, calibrated confidence, missing-source disclosure, and public synthetic fixture.
- Accessible responsive investigation workspace with ownership-backed service path, source filters, ordered evidence timeline, selected citation detail, confidence rationale, and missing-evidence disclosure.
- Human-reviewed local Markdown export that repeats uncertainty and source citations; export stays locked until the reviewer explicitly confirms the evidence boundary.

See [architecture](./docs/architecture.md) for rules and boundaries.
