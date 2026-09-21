import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { EMPTY_EVENT_FILTERS, eventFilterOptions, filterTimelineEvents, hasEventFilters } from "./event-filters";
import { parseTraceText } from "./trace-parser";
import { buildSessionTimeline } from "./timeline-view";

const fixture = readFileSync(new URL("../../public/samples/checkout-failure.ndjson", import.meta.url), "utf8");
const result = parseTraceText(fixture, { format: "ndjson" });
if (!result.ok) throw new Error("Failure fixture must parse");
const timeline = buildSessionTimeline(result.trace, "checkout-failure");
if (!timeline) throw new Error("Failure fixture must have a session");

describe("event filters", () => {
  it("exposes unique sorted actor and type options", () => {
    expect(eventFilterOptions(timeline.events).actors).toEqual(["checkout-api", "checkout-page", "checkout-store", "shopper"]);
    expect(eventFilterOptions(timeline.events).types).toEqual(["network.request", "network.response", "state.transition", "ui.render", "user.action"]);
  });

  it("preserves canonical order and leaves the source timeline intact", () => {
    const visible = filterTimelineEvents(timeline.events, { ...EMPTY_EVENT_FILTERS, actor: "checkout-api" });
    expect(visible.map(({ event }) => event.id)).toEqual(["failure-003", "failure-004"]);
    expect(timeline.events).toHaveLength(6);
  });

  it("combines exact actor, type, outcome, and inclusive minimum duration", () => {
    const visible = filterTimelineEvents(timeline.events, {
      actor: "checkout-api",
      type: "network.request",
      outcome: "failure",
      minimumDurationMs: 428,
    });
    expect(visible.map(({ event }) => event.id)).toEqual(["failure-003"]);
    expect(filterTimelineEvents(timeline.events, { ...EMPTY_EVENT_FILTERS, minimumDurationMs: 429 })).toEqual([]);
  });

  it("does not treat an unrecorded duration as zero", () => {
    const visible = filterTimelineEvents(timeline.events, { ...EMPTY_EVENT_FILTERS, minimumDurationMs: 0 });
    expect(visible.map(({ event }) => event.id)).toEqual(["failure-003", "failure-006"]);
  });

  it("detects and clears active filters", () => {
    expect(hasEventFilters(EMPTY_EVENT_FILTERS)).toBe(false);
    expect(hasEventFilters({ ...EMPTY_EVENT_FILTERS, outcome: "failure" })).toBe(true);
    expect(filterTimelineEvents(timeline.events, EMPTY_EVENT_FILTERS)).toEqual(timeline.events);
  });
});
