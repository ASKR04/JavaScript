import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { buildDebuggingReport } from "./debugging-report";
import { filterTimelineEvents } from "./event-filters";
import { createInvestigation, parseInvestigation, serializeInvestigation } from "./investigation-persistence";
import { selectCausalChain } from "./trace-analysis";
import { compareTraceSessions } from "./trace-comparison";
import { findTraceFindings } from "./trace-findings";
import { parseTraceText } from "./trace-parser";
import { buildSessionTimeline } from "./timeline-view";

const sample = (name: string): string =>
  readFileSync(new URL(`../../public/samples/${name}`, import.meta.url), "utf8");

const importedAt = "2026-09-21T12:00:00.000Z";

const loadCheckoutJourneys = () => {
  const baseline = parseTraceText(sample("checkout-success.json"), { format: "json", importedAt });
  const candidate = parseTraceText(sample("checkout-failure.ndjson"), { format: "ndjson", importedAt });
  if (!baseline.ok || !candidate.ok) {
    throw new Error("Bundled checkout journeys must remain importable");
  }
  return { baseline: baseline.trace, candidate: candidate.trace };
};

describe("bundled checkout journeys across domain boundaries", () => {
  it("connects the failed request to its recorded aftermath without treating sequence as causality", () => {
    const { baseline, candidate } = loadCheckoutJourneys();
    expect(baseline.sessions[0]).toMatchObject({ id: "checkout-success", outcome: "success", eventIds: expect.arrayContaining(["success-006"]) });
    expect(candidate.sessions[0]).toMatchObject({ id: "checkout-failure", outcome: "failure", durationMs: 518 });

    const timeline = buildSessionTimeline(candidate, "checkout-failure");
    expect(timeline?.events.map(({ event, offsetMs }) => [event.id, offsetMs])).toEqual([
      ["failure-001", 0], ["failure-002", 19], ["failure-003", 45],
      ["failure-004", 473], ["failure-005", 490], ["failure-006", 503],
    ]);
    expect(timeline?.events[2].widthPercent).toBeGreaterThan(0);

    const chain = selectCausalChain(candidate, "failure-004");
    expect(chain?.ancestors.map(({ id }) => id)).toEqual(["failure-001", "failure-003"]);
    expect(chain?.descendants.map(({ id }) => id)).toEqual(["failure-005", "failure-006"]);
    expect(chain?.relations).toHaveLength(4);
    expect(chain?.relations.every(({ kind }) => kind === "parent")).toBe(true);
  });

  it("keeps filtering, findings, comparison, and the exported report aligned on the same evidence", () => {
    const { baseline, candidate } = loadCheckoutJourneys();
    const timeline = buildSessionTimeline(candidate, "checkout-failure");
    if (!timeline) throw new Error("Checkout timeline must exist");

    const filtered = filterTimelineEvents(timeline.events, {
      actor: "checkout-api", type: "network.request", outcome: "failure", minimumDurationMs: 400,
    });
    expect(filtered.map(({ event }) => event.id)).toEqual(["failure-003"]);
    expect(candidate.events).toHaveLength(6);
    expect(findTraceFindings(candidate).map(({ id }) => id)).toEqual([
      "slow-span:failure-003", "missing-completion:failure-005",
    ]);
    expect(findTraceFindings(baseline)).toEqual([]);

    const comparison = compareTraceSessions(baseline, "checkout-success", candidate, "checkout-failure");
    expect(comparison?.firstDivergence?.baseline?.id).toBe("success-003");
    expect(comparison?.firstDivergence?.candidate?.id).toBe("failure-003");
    expect(comparison?.firstDivergence?.changes).toEqual(expect.arrayContaining(["outcome", "duration"]));

    const report = buildDebuggingReport({
      trace: candidate,
      sessionId: "checkout-failure",
      selectedEventId: "failure-004",
      generatedAt: importedAt,
      comparison,
    });
    expect(report?.fileName).toBe("eventweave-checkout-failure-report.md");
    expect(report?.markdown).toContain("Payment authorization timed out");
    expect(report?.markdown).toContain("Downstream events: failure-005, failure-006");
    expect(report?.markdown).toContain("## Baseline comparison");
  });

  it("round-trips a selected failure and filters only against the trace it came from", () => {
    const { baseline, candidate } = loadCheckoutJourneys();
    const created = createInvestigation({
      id: "checkout-timeout", name: "Payment timeout review", savedAt: importedAt,
      trace: candidate, sessionId: "checkout-failure", eventId: "failure-004",
      filters: { actor: "checkout-api", outcome: "failure", minimumDurationMs: 400 },
    });
    expect(created.ok).toBe(true);
    if (!created.ok) return;

    const serialized = serializeInvestigation(created.investigation);
    const restored = parseInvestigation(serialized, candidate);
    expect(restored).toEqual(created);
    expect(parseInvestigation(serialized, baseline)).toMatchObject({
      ok: false, errors: expect.arrayContaining([expect.objectContaining({ code: "trace-mismatch" })]),
    });
    expect(selectCausalChain(candidate, created.investigation.selection.eventId)?.focus.id).toBe("failure-004");
  });
});
