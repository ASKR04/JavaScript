import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { parseTraceText } from "./trace-parser";
import { buildSessionTimeline, findTimelineSelection } from "./timeline-view";

const fixture = readFileSync(
  new URL("../../public/samples/checkout-success.json", import.meta.url),
  "utf8",
);

describe("buildSessionTimeline", () => {
  it("maps session events to bounded relative positions in canonical order", () => {
    const result = parseTraceText(fixture, { format: "json" });
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const timeline = buildSessionTimeline(result.trace, "checkout-success");

    expect(timeline?.events.map(({ event }) => event.id)).toEqual([
      "success-001",
      "success-002",
      "success-003",
      "success-004",
      "success-005",
      "success-006",
    ]);
    expect(timeline?.events[0].offsetMs).toBe(0);
    expect(timeline?.events[2].positionPercent).toBeCloseTo(15.65, 1);
    expect(timeline?.events.every(({ positionPercent }) => positionPercent >= 0 && positionPercent <= 100)).toBe(true);
    expect(timeline?.events.every(({ positionPercent, widthPercent }) => positionPercent + widthPercent <= 100)).toBe(true);
  });

  it("contains an unknown session without inventing a timeline", () => {
    const result = parseTraceText(fixture, { format: "json" });
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(buildSessionTimeline(result.trace, "missing-session")).toBeUndefined();
  });
});

describe("findTimelineSelection", () => {
  const eventIds = ["first", "second", "third"];

  it("supports adjacent and boundary keyboard navigation", () => {
    expect(findTimelineSelection(eventIds, "second", "ArrowDown")).toBe("third");
    expect(findTimelineSelection(eventIds, "second", "ArrowLeft")).toBe("first");
    expect(findTimelineSelection(eventIds, "first", "ArrowUp")).toBe("first");
    expect(findTimelineSelection(eventIds, "third", "ArrowRight")).toBe("third");
  });

  it("supports Home and End and contains empty collections", () => {
    expect(findTimelineSelection(eventIds, "second", "Home")).toBe("first");
    expect(findTimelineSelection(eventIds, "second", "End")).toBe("third");
    expect(findTimelineSelection(eventIds, "missing", "ArrowDown")).toBe("first");
    expect(findTimelineSelection([], "missing", "Home")).toBeUndefined();
  });
});
