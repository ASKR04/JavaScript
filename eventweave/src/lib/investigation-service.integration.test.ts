import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { createTestIndexedDbFactory } from "../test/create-test-indexeddb-factory";
import { filterTimelineEvents } from "./event-filters";
import { createInvestigationService } from "./investigation-service";
import { createInvestigationStore } from "./investigation-store";
import { parseTraceText } from "./trace-parser";
import { buildSessionTimeline } from "./timeline-view";

const parseFixture = (name: string, format: "json" | "ndjson") => {
  const text = readFileSync(new URL(`../../public/samples/${name}`, import.meta.url), "utf8");
  const result = parseTraceText(text, { format, importedAt: "2026-09-24T14:00:00.000Z" });
  if (!result.ok) throw new Error(`${name} must remain importable`);
  return result.trace;
};

describe("investigation service with IndexedDB", () => {
  it("round-trips the active selection and filters, then rejects a different trace", async () => {
    const candidate = parseFixture("checkout-failure.ndjson", "ndjson");
    const baseline = parseFixture("checkout-success.json", "json");
    const { factory } = createTestIndexedDbFactory();
    const service = createInvestigationService(createInvestigationStore(factory), {
      createId: () => "checkout-timeout-review",
      now: () => "2026-09-24T14:05:00.000Z",
    });

    const candidateEventIds = candidate.events.map(({ id }) => id);
    const saved = await service.save({
      name: "Payment timeout review",
      trace: candidate,
      sessionId: "checkout-failure",
      eventId: "failure-003",
      filters: { actor: "checkout-api", type: "network.request", outcome: "failure", minimumDurationMs: 400 },
    });
    expect(saved).toEqual({ ok: true, value: {
      id: "checkout-timeout-review",
      name: "Payment timeout review",
      savedAt: "2026-09-24T14:05:00.000Z",
      sessionId: "checkout-failure",
      eventId: "failure-003",
    } });
    if (!saved.ok) throw new Error("Investigation must save through IndexedDB");

    expect(await service.list(candidate)).toEqual({ ok: true, value: [saved.value] });
    const restored = await service.restore("checkout-timeout-review", candidate);
    expect(restored).toEqual({ ok: true, value: {
      ...saved.value,
      filters: { actor: "checkout-api", type: "network.request", outcome: "failure", minimumDurationMs: 400 },
    } });
    if (!restored.ok) throw new Error("Investigation must restore through IndexedDB");

    const timeline = buildSessionTimeline(candidate, restored.value.sessionId);
    if (!timeline) throw new Error("Restored session must remain available in its trace");
    const visibleEvents = filterTimelineEvents(timeline.events, restored.value.filters);
    expect(visibleEvents.map(({ event }) => event.id)).toEqual([restored.value.eventId]);
    expect(candidate.events.map(({ id }) => id)).toEqual(candidateEventIds);

    expect(await service.list(baseline)).toEqual({ ok: true, value: [] });
    expect(await service.restore("checkout-timeout-review", baseline)).toEqual(expect.objectContaining({
      ok: false,
      errors: expect.arrayContaining([expect.objectContaining({ code: "trace-mismatch" })]),
    }));
  });
});
