import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { detectTraceFormat, parseTraceText } from "./trace-parser";

const fixture = (name: string) =>
  readFileSync(new URL(`../../public/samples/${name}`, import.meta.url), "utf8");

const event = (overrides: Record<string, unknown> = {}) => ({
  id: "evt-1",
  sessionId: "checkout-success",
  timestamp: "2026-09-04T14:00:00.000Z",
  type: "user.action",
  actor: "shopper",
  message: "Submitted checkout",
  outcome: "success",
  attributes: { surface: "checkout", attempt: 1 },
  ...overrides,
});

const jsonTrace = (events: unknown[]) =>
  JSON.stringify({ schemaVersion: "1.0", events });

describe("parseTraceText", () => {
  it("imports the profile-save failure sample with its failed response and recovery steps", () => {
    const result = parseTraceText(fixture("profile-save-failure.json"), { format: "json" });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.trace.sessions).toEqual([
      expect.objectContaining({ id: "profile-save-failure", outcome: "failure", durationMs: 702 }),
    ]);
    expect(result.trace.events.find(({ id }) => id === "profile-004")).toEqual(
      expect.objectContaining({ type: "network.response", outcome: "failure", message: "Profile update failed: service unavailable" }),
    );
  });

  it("normalizes JSON events into ordered sessions and causal relations", () => {
    const result = parseTraceText(
      jsonTrace([
        event({
          id: "evt-2",
          timestamp: "2026-09-04T14:00:00.250Z",
          type: "network.response",
          actor: "checkout-api",
          message: "Checkout accepted",
          parentId: "evt-1",
          durationMs: 180,
        }),
        event(),
      ]),
      { format: "json", importedAt: "2026-09-04T15:00:00.000Z" },
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.trace.events.map(({ id }) => id)).toEqual(["evt-1", "evt-2"]);
    expect(result.trace.sessions).toEqual([
      expect.objectContaining({
        id: "checkout-success",
        durationMs: 430,
        outcome: "success",
        eventIds: ["evt-1", "evt-2"],
      }),
    ]);
    expect(result.trace.relations).toEqual([
      { fromEventId: "evt-1", toEventId: "evt-2", kind: "sequence" },
      { fromEventId: "evt-1", toEventId: "evt-2", kind: "parent" },
    ]);
  });

  it("parses NDJSON and reports the source line for malformed JSON", () => {
    const text = `${JSON.stringify(event())}\nnot-json\n${JSON.stringify(
      event({ id: "evt-2" }),
    )}`;
    const result = parseTraceText(text, { format: "ndjson" });

    expect(result).toEqual({
      ok: false,
      format: "ndjson",
      errors: [
        expect.objectContaining({ code: "invalid-json", line: 2, message: expect.stringContaining("Line 2") }),
      ],
    });
  });

  it("rejects invalid fields without partially returning a trace", () => {
    const result = parseTraceText(
      jsonTrace([event(), event({ id: "evt-2", durationMs: -1, attributes: { nested: {} } })]),
    );

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors).toEqual([
      expect.objectContaining({ code: "invalid-event", eventId: "evt-2" }),
    ]);
  });

  it("requires timestamps to identify an absolute instant", () => {
    const result = parseTraceText(jsonTrace([event({ timestamp: "2026-09-04T14:00:00" })]));

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors[0]).toEqual(
      expect.objectContaining({ code: "invalid-event", message: expect.stringContaining("with an offset") }),
    );
  });

  it("rejects duplicate IDs and references to missing parents", () => {
    const result = parseTraceText(
      jsonTrace([event(), event({ parentId: "evt-missing" })]),
    );

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors.map(({ code }) => code).sort()).toEqual([
      "duplicate-event",
      "missing-parent",
    ]);
  });

  it("rejects parent links that cross sessions or point backward in time", () => {
    const result = parseTraceText(
      jsonTrace([
        event({ id: "later", timestamp: "2026-09-04T14:00:01.000Z" }),
        event({
          id: "cross-session",
          sessionId: "another-session",
          parentId: "later",
          timestamp: "2026-09-04T14:00:02.000Z",
        }),
        event({
          id: "too-early",
          parentId: "later",
          timestamp: "2026-09-04T14:00:00.000Z",
        }),
      ]),
    );

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors.map(({ code }) => code)).toEqual([
      "cross-session-parent",
      "parent-after-child",
    ]);
  });

  it("rejects cyclic parent links", () => {
    const result = parseTraceText(
      jsonTrace([
        event({ id: "evt-1", parentId: "evt-2" }),
        event({ id: "evt-2", parentId: "evt-1" }),
      ]),
    );

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors).toEqual([
      expect.objectContaining({ code: "cyclic-parent", eventId: "evt-2" }),
    ]);
  });

  it("enforces byte and event limits before normalization", () => {
    const oversized = parseTraceText(jsonTrace([event()]), { maxBytes: 10 });
    const tooMany = parseTraceText(jsonTrace([event(), event({ id: "evt-2" })]), {
      maxEvents: 1,
    });

    expect(oversized.ok ? undefined : oversized.errors[0].code).toBe("file-too-large");
    expect(tooMany.ok ? undefined : tooMany.errors[0].code).toBe("too-many-events");
  });

  it("detects newline-delimited file extensions", () => {
    expect(detectTraceFormat("checkout.NDJSON")).toBe("ndjson");
    expect(detectTraceFormat("checkout.jsonl")).toBe("ndjson");
    expect(detectTraceFormat("checkout.json")).toBe("json");
  });

  it("keeps the published comparison fixtures inside the import contract", () => {
    const success = parseTraceText(fixture("checkout-success.json"), {
      format: "json",
      importedAt: "2026-09-04T15:00:00.000Z",
    });
    const failure = parseTraceText(fixture("checkout-failure.ndjson"), {
      format: "ndjson",
      importedAt: "2026-09-04T15:00:00.000Z",
    });

    expect(success.ok && success.trace.sessions[0].outcome).toBe("success");
    expect(failure.ok && failure.trace.sessions[0].outcome).toBe("failure");
    expect(success.ok && success.trace.events).toHaveLength(6);
    expect(failure.ok && failure.trace.events).toHaveLength(6);
  });
});
