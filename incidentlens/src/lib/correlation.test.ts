import { describe, expect, it } from "vitest";
import type { IncidentEvidenceBundle } from "../adapters/contracts";
import { syntheticCheckoutIncident } from "../fixtures/synthetic-checkout-incident";
import { correlateIncident } from "./correlation";

const cloneFixture = (): IncidentEvidenceBundle => structuredClone(syntheticCheckoutIncident);

describe("correlateIncident", () => {
  it("finds the earliest explicit abnormal event and classifies an upstream lead", () => {
    const result = correlateIncident(syntheticCheckoutIncident);
    expect(result.earliestAbnormal?.id).toBe("trace:span-payment");
    expect(result.location).toBe("upstream");
    expect(result.confidence).toMatchObject({ level: "high", score: 0.9 });
    expect(result.citations.map(({ source }) => source)).toEqual(["trace", "log"]);
    expect(result.explanation).toContain("not a root-cause claim");
  });

  it("uses a deterministic source and identifier tie-break for equal timestamps", () => {
    const fixture = cloneFixture();
    fixture.logs = [
      { id: "z-log", service: "checkout-api", timestamp: "2026-10-28T14:02:15.000Z", level: "error", message: "Synthetic later-priority log" },
    ];
    expect(correlateIncident(fixture).earliestAbnormal?.id).toBe("trace:span-payment");
  });

  it("reports insufficient evidence instead of guessing when no source is abnormal", () => {
    const fixture = cloneFixture();
    fixture.spans = fixture.spans.map((span) => ({ ...span, outcome: "success", statusCode: 200 }));
    fixture.logs = fixture.logs.map((log) => ({ ...log, level: "info" }));
    const result = correlateIncident(fixture);
    expect(result.earliestAbnormal).toBeUndefined();
    expect(result.location).toBe("insufficient-evidence");
    expect(result.confidence.score).toBe(0);
    expect(result.citations).toHaveLength(1);
  });

  it("classifies local and downstream evidence only when topology supports it", () => {
    const local = cloneFixture();
    local.spans = [{ ...local.spans[0], service: "checkout-api" }];
    local.logs = [];
    expect(correlateIncident(local).location).toBe("local");

    const downstream = cloneFixture();
    downstream.spans = [{ ...downstream.spans[0], service: "receipt-worker" }];
    downstream.logs = [];
    expect(correlateIncident(downstream).location).toBe("downstream");
  });

  it("makes missing source coverage explicit", () => {
    const fixture = cloneFixture();
    fixture.logs = [];
    fixture.deployments = [];
    fixture.configChanges = [];
    const result = correlateIncident(fixture);
    expect(result.missingEvidence.map(({ source }) => source)).toEqual(["log", "deployment", "config"]);
    expect(result.confidence.level).toBe("medium");
  });
});
