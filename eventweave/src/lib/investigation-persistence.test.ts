import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  INVESTIGATION_SCHEMA_VERSION,
  MAX_INVESTIGATION_BYTES,
  createInvestigation,
  fingerprintTrace,
  parseInvestigation,
  serializeInvestigation,
} from "./investigation-persistence";
import { parseTraceText } from "./trace-parser";

const fixture = readFileSync(new URL("../../public/samples/checkout-failure.ndjson", import.meta.url), "utf8");
const parsed = parseTraceText(fixture, { format: "ndjson", importedAt: "2026-09-15T15:00:00.000Z" });
if (!parsed.ok) throw new Error("Failure fixture must parse");
const trace = parsed.trace;

const createValid = () => createInvestigation({
  id: "investigation-payment-timeout",
  name: "Payment timeout",
  savedAt: "2026-09-15T15:05:00.000Z",
  trace,
  sessionId: "checkout-failure",
  eventId: "failure-003",
  filters: { actor: "checkout-api", outcome: "failure", minimumDurationMs: 400 },
});

describe("investigation persistence", () => {
  it("round-trips a versioned selection and filter snapshot", () => {
    const created = createValid();
    expect(created.ok).toBe(true);
    if (!created.ok) return;
    const restored = parseInvestigation(serializeInvestigation(created.investigation), trace);
    expect(restored).toEqual(created);
    expect(restored.ok && restored.investigation.version).toBe(INVESTIGATION_SCHEMA_VERSION);
  });

  it("creates a deterministic fingerprint independent of import time", () => {
    expect(fingerprintTrace(trace)).toBe(fingerprintTrace({ ...trace, importedAt: "2030-01-01T00:00:00.000Z" }));
    expect(fingerprintTrace({ ...trace, events: trace.events.slice(1) })).not.toBe(fingerprintTrace(trace));
  });

  it("rejects malformed, oversized, and unsupported data", () => {
    expect(parseInvestigation("not json", trace)).toMatchObject({ ok: false, errors: [{ code: "invalid-json" }] });
    expect(parseInvestigation(`"${"x".repeat(MAX_INVESTIGATION_BYTES)}"`, trace)).toMatchObject({ ok: false, errors: [{ code: "too-large" }] });
    expect(parseInvestigation(JSON.stringify({ version: 2 }), trace)).toMatchObject({ ok: false, errors: [{ code: "unsupported-version" }] });
  });

  it("rejects a snapshot for a changed trace", () => {
    const created = createValid();
    expect(created.ok).toBe(true);
    if (!created.ok) return;
    const changed = { ...trace, events: trace.events.slice(1) };
    expect(parseInvestigation(serializeInvestigation(created.investigation), changed)).toMatchObject({ ok: false, errors: [{ code: "trace-mismatch" }] });
  });

  it("rejects stale session-event pairs even with the expected fingerprint", () => {
    const created = createValid();
    expect(created.ok).toBe(true);
    if (!created.ok) return;
    const value = { ...created.investigation, selection: { sessionId: "checkout-failure", eventId: "unknown" } };
    expect(parseInvestigation(JSON.stringify(value), trace)).toMatchObject({ ok: false, errors: [{ code: "stale-selection" }] });
  });

  it("rejects invalid identity, timestamps, and filters during creation", () => {
    const result = createInvestigation({
      id: " padded ",
      name: "",
      savedAt: "yesterday",
      trace,
      sessionId: "checkout-failure",
      eventId: "failure-003",
      filters: { outcome: "failure", minimumDurationMs: Number.NaN },
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors.map(({ code }) => code)).toEqual(["invalid-shape", "invalid-shape", "invalid-shape", "invalid-shape"]);
  });

  it("rejects an event from another session", () => {
    const result = createInvestigation({
      id: "investigation-stale",
      name: "Stale selection",
      savedAt: "2026-09-15T15:05:00.000Z",
      trace,
      sessionId: "unknown-session",
      eventId: "failure-003",
    });
    expect(result).toMatchObject({ ok: false, errors: [{ code: "stale-selection" }] });
  });
});
