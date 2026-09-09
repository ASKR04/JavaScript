import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import type { NormalizedTrace, TraceEvent } from "./trace-model";
import { parseTraceText } from "./trace-parser";
import { compareTraceSessions } from "./trace-comparison";

const successFixture = readFileSync(
  new URL("../../public/samples/checkout-success.json", import.meta.url),
  "utf8",
);
const failureFixture = readFileSync(
  new URL("../../public/samples/checkout-failure.ndjson", import.meta.url),
  "utf8",
);

const parseFixture = (text: string, format: "json" | "ndjson"): NormalizedTrace => {
  const result = parseTraceText(text, { format, importedAt: "2026-09-09T14:00:00.000Z" });
  if (!result.ok) throw new Error("Fixture must remain valid.");
  return result.trace;
};

const makeTrace = (events: TraceEvent[], sessionId = "session"): NormalizedTrace => ({
  schemaVersion: "1.0",
  importedAt: "2026-09-09T14:00:00.000Z",
  events,
  relations: [],
  sessions: [{
    id: sessionId,
    startTime: events[0]?.timestamp ?? "2026-09-09T14:00:00.000Z",
    endTime: events.at(-1)?.timestamp ?? "2026-09-09T14:00:00.000Z",
    durationMs: 0,
    outcome: "success",
    eventIds: events.map(({ id }) => id),
  }],
});

const makeEvent = (overrides: Partial<TraceEvent> = {}): TraceEvent => ({
  id: "event-1",
  sessionId: "session",
  timestamp: "2026-09-09T14:00:00.000Z",
  timestampMs: Date.parse("2026-09-09T14:00:00.000Z"),
  type: "user.action",
  actor: "shopper",
  message: "Submitted checkout",
  outcome: "success",
  attributes: {},
  ...overrides,
});

describe("compareTraceSessions", () => {
  it("finds the first meaningful checkout divergence with transparent signals", () => {
    const baseline = parseFixture(successFixture, "json");
    const candidate = parseFixture(failureFixture, "ndjson");

    const comparison = compareTraceSessions(
      baseline,
      "checkout-success",
      candidate,
      "checkout-failure",
    );

    expect(comparison?.confidence).toBe("medium");
    expect(comparison?.alignments).toHaveLength(6);
    expect(comparison?.firstDivergence?.baseline?.id).toBe("success-003");
    expect(comparison?.firstDivergence?.candidate?.id).toBe("failure-003");
    expect(comparison?.firstDivergence?.changes).toEqual(["outcome", "duration"]);
  });

  it("prefers stable IDs and reports semantic changes on the aligned event", () => {
    const baseline = makeTrace([makeEvent()]);
    const candidate = makeTrace([makeEvent({
      type: "network.request",
      actor: "checkout-api",
      message: "Authorization requested",
    })]);

    const comparison = compareTraceSessions(baseline, "session", candidate, "session");

    expect(comparison?.alignments[0]).toMatchObject({
      matchBasis: "stable-id",
      confidence: 1,
      changes: ["type", "actor", "label"],
    });
  });

  it("keeps insertions explicit instead of forcing an unrelated match", () => {
    const first = makeEvent({ id: "baseline-1" });
    const inserted = makeEvent({
      id: "candidate-extra",
      type: "cache.read",
      actor: "browser-cache",
      message: "Read checkout draft",
    });
    const candidateMatch = makeEvent({ id: "candidate-1" });

    const comparison = compareTraceSessions(
      makeTrace([first]),
      "session",
      makeTrace([inserted, candidateMatch]),
      "session",
    );

    expect(comparison?.alignments.map(({ changes }) => changes)).toEqual([
      ["missing-baseline"],
      [],
    ]);
    expect(comparison?.firstDivergence?.candidate?.id).toBe("candidate-extra");
  });

  it("returns no comparison when either requested session is absent", () => {
    const trace = makeTrace([makeEvent()]);
    expect(compareTraceSessions(trace, "missing", trace, "session")).toBeUndefined();
    expect(compareTraceSessions(trace, "session", trace, "missing")).toBeUndefined();
  });
});
