import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { createInvestigationStore } from "./investigation-store";
import { parseTraceText } from "./trace-parser";

const fixture = readFileSync(new URL("../../public/samples/checkout-failure.ndjson", import.meta.url), "utf8");
const parsed = parseTraceText(fixture, { format: "ndjson", importedAt: "2026-09-21T12:00:00.000Z" });
if (!parsed.ok) throw new Error("Failure fixture must parse");
const trace = parsed.trace;

const input = (id = "payment-timeout") => ({
  id,
  name: "Payment timeout",
  savedAt: "2026-09-21T12:05:00.000Z",
  trace,
  sessionId: "checkout-failure",
  eventId: "failure-003",
  filters: { actor: "checkout-api", outcome: "failure" as const },
});

/** Minimal asynchronous IndexedDB double: requests settle before transaction completion. */
const createFactory = () => {
  const records = new Map<string, unknown>();
  let initialized = false;
  let failWrites = false;
  const database = {
    objectStoreNames: { contains: () => initialized },
    createObjectStore: () => { initialized = true; },
    close: () => undefined,
    transaction: (_name: string, mode: IDBTransactionMode) => {
      const transaction: {
        oncomplete?: () => void;
        onerror?: () => void;
        onabort?: () => void;
        error: Error | null;
        objectStore: () => object;
        abort: () => void;
      } = {
        error: null,
        objectStore: () => ({
          put: (value: { id: string }) => finish(() => records.set(value.id, value)),
          delete: (id: string) => finish(() => records.delete(id)),
          get: (id: string) => request(() => records.get(id)),
          getAll: () => request(() => [...records.values()]),
        }),
        abort: () => transaction.onabort?.(),
      };
      const finish = (action: () => void) => queueMicrotask(() => {
        if (failWrites && mode === "readwrite") {
          transaction.error = new Error("Quota exceeded");
          transaction.onabort?.();
          return;
        }
        action();
        queueMicrotask(() => transaction.oncomplete?.());
      });
      const request = (read: () => unknown) => {
        const result: { result?: unknown; onsuccess?: () => void; onerror?: () => void } = {};
        queueMicrotask(() => {
          result.result = read();
          result.onsuccess?.();
          queueMicrotask(() => transaction.oncomplete?.());
        });
        return result;
      };
      return transaction;
    },
  };
  const factory = {
    open: () => {
      const request: {
        result: typeof database;
        onupgradeneeded?: () => void;
        onsuccess?: () => void;
        onerror?: () => void;
        onblocked?: () => void;
      } = { result: database };
      queueMicrotask(() => {
        if (!initialized) request.onupgradeneeded?.();
        request.onsuccess?.();
      });
      return request;
    },
  } as unknown as IDBFactory;
  return { factory, records, setFailWrites: (value: boolean) => { failWrites = value; } };
};

describe("IndexedDB investigation store", () => {
  it("saves, loads, lists, and removes a validated investigation", async () => {
    const { factory, records } = createFactory();
    const store = createInvestigationStore(factory);
    const saved = await store.save(input());
    expect(saved).toMatchObject({ ok: true, value: { name: "Payment timeout" } });
    if (!saved.ok) throw new Error("Investigation must save");
    expect(records.get("payment-timeout")).toMatchObject({ id: "payment-timeout", payload: expect.any(String) });
    expect(await store.load("payment-timeout", trace)).toEqual(saved);
    expect(await store.list(trace)).toEqual({ ok: true, value: [saved.value] });
    expect(await store.remove("payment-timeout")).toEqual({ ok: true, value: undefined });
    expect(await store.load("payment-timeout", trace)).toMatchObject({ ok: false, errors: [{ code: "not-found" }] });
  });

  it("rejects invalid input before opening or writing storage", async () => {
    const { factory, records } = createFactory();
    const result = await createInvestigationStore(factory).save({ ...input(), eventId: "missing" });
    expect(result).toMatchObject({ ok: false, errors: [{ code: "stale-selection" }] });
    expect(records.size).toBe(0);
  });

  it("does not restore an investigation against a changed trace", async () => {
    const { factory } = createFactory();
    const store = createInvestigationStore(factory);
    await store.save(input());
    const changed = { ...trace, events: [] };
    expect(await store.load("payment-timeout", changed)).toMatchObject({ ok: false, errors: [{ code: "trace-mismatch" }] });
    expect(await store.list(changed)).toEqual({ ok: true, value: [] });
  });

  it("rejects damaged stored data instead of exposing it to the UI", async () => {
    const { factory, records } = createFactory();
    const store = createInvestigationStore(factory);
    records.set("damaged", { id: "damaged", payload: "not json" });
    expect(await store.load("damaged", trace)).toMatchObject({ ok: false, errors: [{ code: "invalid-json" }] });
    expect(await store.list(trace)).toMatchObject({ ok: false, errors: [{ code: "invalid-json" }] });
  });

  it("reports unavailable storage and failed writes without claiming success", async () => {
    expect(await createInvestigationStore(undefined).save(input())).toMatchObject({ ok: false, errors: [{ code: "unavailable" }] });
    const { factory, setFailWrites } = createFactory();
    setFailWrites(true);
    expect(await createInvestigationStore(factory).save(input())).toMatchObject({ ok: false, errors: [{ code: "storage-error" }] });
  });
});
