import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { describeAlignment, describeFirstDivergence } from "./comparison-presentation";
import { compareTraceSessions } from "./trace-comparison";
import { parseTraceText } from "./trace-parser";

const successFixture = readFileSync(new URL("../../public/samples/checkout-success.json", import.meta.url), "utf8");
const failureFixture = readFileSync(new URL("../../public/samples/checkout-failure.ndjson", import.meta.url), "utf8");

describe("comparison presentation", () => {
  it("explains the fixture-backed first divergence", () => {
    const baseline = parseTraceText(successFixture, { format: "json" });
    const candidate = parseTraceText(failureFixture, { format: "ndjson" });
    expect(baseline.ok && candidate.ok).toBe(true);
    if (!baseline.ok || !candidate.ok) return;

    const comparison = compareTraceSessions(
      baseline.trace,
      "checkout-success",
      candidate.trace,
      "checkout-failure",
    );

    expect(comparison).toBeDefined();
    if (!comparison) return;
    expect(describeFirstDivergence(comparison)).toBe(
      "First divergence: Payment authorization requested (outcome, duration).",
    );
  });

  it("keeps missing and unchanged alignment language explicit", () => {
    expect(describeAlignment({ matchBasis: "unmatched", confidence: 0, changes: ["missing-candidate"], baseline: {} as never })).toBe("Only in baseline");
    expect(describeAlignment({ matchBasis: "semantic", confidence: 0.95, changes: [], baseline: {} as never, candidate: {} as never })).toBe("No meaningful change");
  });
});
