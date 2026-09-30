import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { compareTraceSessions } from "./trace-comparison";
import { buildDebuggingReport } from "./debugging-report";
import { parseTraceText } from "./trace-parser";

const successFixture = readFileSync(new URL("../../public/samples/checkout-success.json", import.meta.url), "utf8");
const failureFixture = readFileSync(new URL("../../public/samples/checkout-failure.ndjson", import.meta.url), "utf8");

describe("buildDebuggingReport", () => {
  it("exports the selected session, explicit causal context, and paired divergence", () => {
    const baseline = parseTraceText(successFixture, { format: "json" });
    const candidate = parseTraceText(failureFixture, { format: "ndjson" });
    expect(baseline.ok && candidate.ok).toBe(true);
    if (!baseline.ok || !candidate.ok) return;
    const comparison = compareTraceSessions(baseline.trace, "checkout-success", candidate.trace, "checkout-failure");
    expect(comparison).toBeDefined();

    const report = buildDebuggingReport({
      trace: candidate.trace,
      sessionId: "checkout-failure",
      selectedEventId: "failure-003",
      generatedAt: "2026-09-13T22:00:00.000Z",
      comparison,
    });

    expect(report?.fileName).toBe("eventweave-checkout-failure-report.md");
    expect(report?.markdown).toContain("## Explicit causal context");
    expect(report?.markdown).toContain("- Ancestors: failure-001");
    expect(report?.markdown).toContain("- First divergence: Payment authorization requested \\(outcome, duration\\).");
    expect(report?.markdown).toContain("| 2026-09-04T14:05:00.045Z | failure-003 | checkout-api |");
    expect(report?.markdown).toContain("Review imported trace content before sharing");
  });

  it("rejects a selection outside the requested session", () => {
    const result = parseTraceText(successFixture, { format: "json" });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(buildDebuggingReport({ trace: result.trace, sessionId: "checkout-success", selectedEventId: "unknown", generatedAt: "2026-09-13T22:00:00.000Z" })).toBeUndefined();
  });

  it("escapes imported Markdown and limits unsafe filename characters", () => {
    const result = parseTraceText(successFixture, { format: "json" });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const trace = {
      ...result.trace,
      sessions: result.trace.sessions.map((session) => ({ ...session, id: "checkout / private" })),
      events: result.trace.events.map((event) => event.id === "success-001"
        ? { ...event, message: "[secret](https://example.com) | next\nrow" }
        : event),
    };
    const report = buildDebuggingReport({ trace, sessionId: "checkout / private", selectedEventId: "success-001", generatedAt: "2026-09-13T22:00:00.000Z" });
    expect(report?.fileName).toBe("eventweave-checkout-private-report.md");
    expect(report?.markdown).toContain("\\[secret\\]\\(https://example.com\\) \\| next row");
    expect(report?.markdown).not.toContain("next\nrow");
  });
});
