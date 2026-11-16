import { describe, expect, it } from "vitest";
import { syntheticCheckoutIncident } from "../fixtures/synthetic-checkout-incident";
import { parseSyntheticIncidentJson } from "./evidence-import";

const fixtureJson = () => JSON.stringify(syntheticCheckoutIncident);

describe("parseSyntheticIncidentJson", () => {
  it("validates and normalizes a bounded public synthetic evidence bundle", () => {
    const raw = structuredClone(syntheticCheckoutIncident) as { ticket: { title: string } } & typeof syntheticCheckoutIncident;
    raw.ticket.title = `  ${raw.ticket.title}  `;
    const result = parseSyntheticIncidentJson(JSON.stringify(raw));
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.bundle.ticket.title).toBe(syntheticCheckoutIncident.ticket.title);
      expect(result.bundle.spans).toHaveLength(2);
    }
  });

  it("rejects malformed JSON and oversized input before parsing", () => {
    expect(parseSyntheticIncidentJson("{")).toMatchObject({ ok: false, issues: [{ code: "invalid-json" }] });
    expect(parseSyntheticIncidentJson(fixtureJson(), { maxBytes: 10, maxSpans: 1, maxLogs: 1, maxChanges: 1, maxOwnership: 1 })).toMatchObject({ ok: false, issues: [{ code: "limit-exceeded" }] });
  });

  it("enforces synthetic ticket identifiers and a default-deny schema", () => {
    const raw = JSON.parse(fixtureJson());
    raw.ticket.id = "INC-1042";
    raw.ticket.authorizationToken = "not-accepted";
    const result = parseSyntheticIncidentJson(JSON.stringify(raw));
    expect(result).toMatchObject({ ok: false });
    if (!result.ok) expect(result.issues.map(({ code }) => code)).toEqual(expect.arrayContaining(["unsafe-input"]));
  });

  it("rejects invalid timestamps and records beyond configured limits", () => {
    const raw = JSON.parse(fixtureJson());
    raw.logs[0].timestamp = "yesterday";
    const result = parseSyntheticIncidentJson(JSON.stringify(raw), { maxBytes: 999_999, maxSpans: 1, maxLogs: 5, maxChanges: 5, maxOwnership: 5 });
    expect(result).toMatchObject({ ok: false });
    if (!result.ok) expect(result.issues.map(({ code }) => code)).toEqual(expect.arrayContaining(["invalid-value", "limit-exceeded"]));
  });

  it("rejects dangling parent spans and uncorrelated log trace identifiers", () => {
    const raw = JSON.parse(fixtureJson());
    raw.spans[0].parentSpanId = "missing-span";
    raw.logs[0].traceId = "missing-trace";
    const result = parseSyntheticIncidentJson(JSON.stringify(raw));
    expect(result).toMatchObject({ ok: false });
    if (!result.ok) expect(result.issues.filter(({ code }) => code === "broken-reference")).toHaveLength(2);
  });
});
