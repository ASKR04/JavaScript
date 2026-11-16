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
- Read-only foundation screen. Interactive investigation UI is the next shift.
- Bounded, default-deny JSON import validation for public `INC-SYN-` fixtures, including cross-record trace and parent-span checks.

See [architecture](./docs/architecture.md) for rules and boundaries.
