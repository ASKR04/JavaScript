import { describe, expect, it } from "vitest";
import { syntheticCheckoutIncident } from "../fixtures/synthetic-checkout-incident";
import { correlateIncident } from "./correlation";
import { buildEvidenceTimeline, buildReviewedReport, buildServicePath } from "./investigation-view";

describe("IncidentLens investigation presentation", () => {
  const result = correlateIncident(syntheticCheckoutIncident);

  it("orders all supplied evidence and preserves explicit abnormal flags", () => {
    const timeline = buildEvidenceTimeline(syntheticCheckoutIncident);
    expect(timeline).toHaveLength(6);
    expect(timeline.map(({ source }) => source)).toEqual(["config", "deployment", "trace", "log", "trace", "log"]);
    expect(timeline.filter(({ abnormal }) => abnormal).map(({ id }) => id)).toEqual([
      "trace:span-payment", "log:log-payment-503", "trace:span-checkout",
    ]);
  });

  it("marks the correlated service as the evidence lead in the service path", () => {
    const path = buildServicePath(syntheticCheckoutIncident, result);
    expect(path.find(({ service }) => service === "payments-api")?.role).toBe("evidence lead");
    expect(path.find(({ service }) => service === "checkout-api")?.team).toBe("Synthetic Commerce");
  });

  it("exports a review-labelled report with citations and no root-cause verdict", () => {
    const report = buildReviewedReport(syntheticCheckoutIncident, result, "Reviewed against the supplied fixture.");
    expect(report.fileName).toBe("inc-syn-1042-review.md");
    expect(report.markdown).toContain("human-reviewed triage lead");
    expect(report.markdown).toContain("not a root-cause verdict");
    expect(report.markdown).toContain("[trace:span-payment]");
    expect(report.markdown).toContain("Reviewed against the supplied fixture.");
  });
});
