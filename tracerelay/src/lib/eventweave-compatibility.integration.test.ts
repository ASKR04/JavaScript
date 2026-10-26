import { describe, expect, it } from "vitest";
import { parseTraceText } from "../../../eventweave/src/lib/trace-parser";
import { createDemoCapture, recordProfileJourney } from "./demo-journey";

const importedAt = "2026-10-26T15:00:00.000Z";

describe("EventWeave export compatibility", () => {
  it("imports JSON and NDJSON into the same protected causal journey", () => {
    const demo = createDemoCapture();
    demo.capture.start();
    const recorded = recordProfileJourney(demo, "failure");
    demo.capture.stop();

    const json = demo.capture.toJson();
    const ndjson = demo.capture.toNdjson();

    for (const exported of [json, ndjson]) {
      expect(exported).not.toContain("person@example.test");
      expect(exported).not.toContain("synthetic-secret-that-must-not-survive");
      expect(exported).not.toContain("authorization");
      expect(exported).toContain("••••");
    }

    const jsonImport = parseTraceText(json, { format: "json", importedAt });
    const ndjsonImport = parseTraceText(ndjson, { format: "ndjson", importedAt });

    expect(jsonImport.ok).toBe(true);
    expect(ndjsonImport.ok).toBe(true);
    if (!jsonImport.ok || !ndjsonImport.ok) return;

    expect(ndjsonImport.trace).toEqual(jsonImport.trace);
    expect(jsonImport.trace.events.map((event) => event.id)).toEqual(
      recorded.map((event) => event.id),
    );
    expect(
      jsonImport.trace.relations
        .filter((relation) => relation.kind === "parent")
        .map(({ fromEventId, toEventId }) => [fromEventId, toEventId]),
    ).toEqual(recorded.slice(1).map((event) => [event.parentId, event.id]));

    const stateTransition = jsonImport.trace.events.find(
      (event) => event.type === "state.transition",
    );
    const request = jsonImport.trace.events.find((event) => event.type === "network.request");
    expect(stateTransition?.attributes.email).toBe("••••");
    expect(request?.attributes).toEqual({ method: "PATCH", route: "/api/profile" });
  });
});
