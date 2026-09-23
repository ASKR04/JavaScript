import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";
import { createInvestigationService } from "./investigation-service";
import type { InvestigationStore, InvestigationStoreError, StoreResult } from "./investigation-store";
import type { InvestigationError, SavedInvestigation } from "./investigation-persistence";
import { fingerprintTrace } from "./investigation-persistence";
import { parseTraceText } from "./trace-parser";

const fixture = readFileSync(new URL("../../public/samples/checkout-failure.ndjson", import.meta.url), "utf8");
const parsed = parseTraceText(fixture, { format: "ndjson", importedAt: "2026-09-23T14:00:00.000Z" });
if (!parsed.ok) throw new Error("Failure fixture must parse");
const trace = parsed.trace;

const savedInvestigation = (id = "investigation-1"): SavedInvestigation => ({
  version: 1,
  id,
  name: "Payment timeout",
  savedAt: "2026-09-23T14:05:00.000Z",
  traceFingerprint: fingerprintTrace(trace),
  selection: { sessionId: "checkout-failure", eventId: "failure-003" },
  filters: { actor: "checkout-api", type: "network.request", outcome: "failure", minimumDurationMs: 400 },
});

const success = <T>(value: T): StoreResult<T> => ({ ok: true, value });
const failure = <T>(errors: Array<InvestigationError | InvestigationStoreError>): StoreResult<T> => ({ ok: false, errors });

const createStore = (overrides: Partial<InvestigationStore> = {}): InvestigationStore => ({
  save: vi.fn(async () => success(savedInvestigation())),
  load: vi.fn(async () => success(savedInvestigation())),
  list: vi.fn(async () => success([savedInvestigation()])),
  remove: vi.fn(async () => success(undefined)),
  ...overrides,
});

describe("investigation service", () => {
  it("adds generated identity and time while preserving the current workspace", async () => {
    const store = createStore();
    const service = createInvestigationService(store, {
      createId: () => "investigation-1",
      now: () => "2026-09-23T14:05:00.000Z",
    });
    const filters = { actor: "checkout-api", type: "network.request", outcome: "failure" as const, minimumDurationMs: 400 };

    const result = await service.save({
      name: "Payment timeout",
      trace,
      sessionId: "checkout-failure",
      eventId: "failure-003",
      filters,
    });

    expect(store.save).toHaveBeenCalledWith({
      id: "investigation-1",
      name: "Payment timeout",
      savedAt: "2026-09-23T14:05:00.000Z",
      trace,
      sessionId: "checkout-failure",
      eventId: "failure-003",
      filters,
    });
    expect(result).toEqual({ ok: true, value: {
      id: "investigation-1",
      name: "Payment timeout",
      savedAt: "2026-09-23T14:05:00.000Z",
      sessionId: "checkout-failure",
      eventId: "failure-003",
    } });
  });

  it("returns summaries without exposing fingerprints or serialized data", async () => {
    const service = createInvestigationService(createStore({
      list: vi.fn(async () => success([savedInvestigation("newest"), savedInvestigation("older")])),
    }));

    expect(await service.list(trace)).toEqual({ ok: true, value: [
      expect.objectContaining({ id: "newest", sessionId: "checkout-failure", eventId: "failure-003" }),
      expect.objectContaining({ id: "older", sessionId: "checkout-failure", eventId: "failure-003" }),
    ] });
    const result = await service.list(trace);
    if (!result.ok) throw new Error("List must succeed");
    expect(result.value[0]).not.toHaveProperty("traceFingerprint");
    expect(result.value[0]).not.toHaveProperty("filters");
  });

  it("maps only validated restore state for the UI to apply", async () => {
    const service = createInvestigationService(createStore());

    expect(await service.restore("investigation-1", trace)).toEqual({ ok: true, value: {
      id: "investigation-1",
      name: "Payment timeout",
      savedAt: "2026-09-23T14:05:00.000Z",
      sessionId: "checkout-failure",
      eventId: "failure-003",
      filters: { actor: "checkout-api", type: "network.request", outcome: "failure", minimumDurationMs: 400 },
    } });
  });

  it("passes validation and storage failures through without partial UI state", async () => {
    const errors = [{ code: "trace-mismatch" as const, message: "This investigation belongs to another trace." }];
    const store = createStore({
      load: vi.fn(async () => failure<SavedInvestigation>(errors)),
      list: vi.fn(async () => failure<SavedInvestigation[]>(errors)),
    });
    const service = createInvestigationService(store);

    expect(await service.restore("investigation-1", trace)).toEqual({ ok: false, errors });
    expect(await service.list(trace)).toEqual({ ok: false, errors });
  });

  it("delegates removal without changing store errors", async () => {
    const errors = [{ code: "storage-error" as const, message: "Storage failed." }];
    const store = createStore({ remove: vi.fn(async () => failure<void>(errors)) });
    const service = createInvestigationService(store);

    expect(await service.remove("investigation-1")).toEqual({ ok: false, errors });
    expect(store.remove).toHaveBeenCalledWith("investigation-1");
  });
});
