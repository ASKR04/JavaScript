import { describe, expect, it } from "vitest";
import { createDemoCapture, recordProfileJourney } from "./demo-journey";

describe("synthetic profile journeys", () => {
  it.each([
    ["success", 200, "Profile saved confirmation displayed"],
    ["failure", 503, "Could not save profile banner displayed"],
  ] as const)("records and protects the %s journey", (outcome, status, finalMessage) => {
    const demo = createDemoCapture();
    demo.capture.start();
    const events = recordProfileJourney(demo, outcome);
    demo.capture.stop();

    const review = demo.capture.toReview(`Profile save — ${outcome}`);
    const trace = demo.capture.toEventWeaveTrace();
    expect(events).toHaveLength(6);
    expect(review.events.at(-1)?.name).toBe(finalMessage);
    expect(trace.events[4]?.attributes?.status).toBe(status);
    expect(trace.events[4]?.outcome).toBe(outcome);
    expect(JSON.stringify(review)).not.toContain("synthetic-secret-that-must-not-survive");
    expect(JSON.stringify(trace)).not.toContain("synthetic-secret-that-must-not-survive");
    expect(review.events[2]?.attributes).toContainEqual({
      key: "email",
      value: "••••",
      treatment: "masked",
    });
  });
});
