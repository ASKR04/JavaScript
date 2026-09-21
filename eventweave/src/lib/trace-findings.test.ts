import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { findTraceFindings } from "./trace-findings";
import { parseTraceText } from "./trace-parser";

const successFixture = readFileSync(new URL("../../public/samples/checkout-success.json", import.meta.url), "utf8");
const failureFixture = readFileSync(new URL("../../public/samples/checkout-failure.ndjson", import.meta.url), "utf8");

describe("findTraceFindings", () => {
  it("reports the failed checkout's slow request and absent completion with stable evidence IDs", () => {
    const result = parseTraceText(failureFixture, { format: "ndjson" });
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const findings = findTraceFindings(result.trace);
    expect(findings.map(({ id, eventIds }) => [id, eventIds])).toEqual([
      ["slow-span:failure-003", ["failure-003"]],
      ["missing-completion:failure-005", ["failure-005"]],
    ]);
    expect(findings[0].explanation).toContain("400 ms threshold");
    expect(findings[1].explanation).toContain("may be incomplete");
  });

  it("produces no findings for the successful checkout", () => {
    const result = parseTraceText(successFixture, { format: "json" });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(findTraceFindings(result.trace)).toEqual([]);
  });

  it("groups only repeated failures with the same actor and type", () => {
    const result = parseTraceText(failureFixture, { format: "ndjson" });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const trace = {
      ...result.trace,
      events: result.trace.events.map((event) => event.id === "failure-004"
        ? { ...event, type: "network.request" }
        : event),
    };
    const repeated = findTraceFindings(trace).find(({ kind }) => kind === "repeated-failure");
    expect(repeated?.eventIds).toEqual(["failure-003", "failure-004"]);
    expect(repeated?.explanation).toContain("threshold is 2");
    expect(findTraceFindings(trace, { repeatedFailureCount: 3 }).some(({ kind }) => kind === "repeated-failure")).toBe(false);
  });

  it("honors inclusive duration boundaries and configurable completion vocabulary", () => {
    const result = parseTraceText(successFixture, { format: "json" });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(findTraceFindings(result.trace, { slowDurationMs: 184 }).map(({ id }) => id)).toContain("slow-span:success-003");
    expect(findTraceFindings(result.trace, { completionStates: ["approved"] }).some(({ kind }) => kind === "missing-completion")).toBe(true);
  });

  it("does not infer missing completion when no transition vocabulary is present", () => {
    const result = parseTraceText(successFixture, { format: "json" });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const trace = { ...result.trace, events: result.trace.events.filter(({ type }) => type !== "state.transition") };
    expect(findTraceFindings(trace).some(({ kind }) => kind === "missing-completion")).toBe(false);
  });

  it("rejects invalid numeric rule settings", () => {
    const result = parseTraceText(successFixture, { format: "json" });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(() => findTraceFindings(result.trace, { slowDurationMs: Number.NaN })).toThrow(RangeError);
    expect(() => findTraceFindings(result.trace, { repeatedFailureCount: 1 })).toThrow(RangeError);
  });
});
