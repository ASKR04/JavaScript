import type { NormalizedTrace } from "./trace-model";
import {
  MAX_INVESTIGATION_BYTES,
  createInvestigation,
  parseInvestigation,
  serializeInvestigation,
  type InvestigationError,
  type InvestigationInput,
  type SavedInvestigation,
} from "./investigation-persistence";

const DATABASE_NAME = "eventweave-investigations";
const DATABASE_VERSION = 1;
const STORE_NAME = "snapshots";

export interface InvestigationStoreError {
  code: "unavailable" | "storage-error" | "not-found";
  message: string;
}

export type StoreResult<T> =
  | { ok: true; value: T }
  | { ok: false; errors: Array<InvestigationError | InvestigationStoreError> };

export interface InvestigationStore {
  save(input: InvestigationInput): Promise<StoreResult<SavedInvestigation>>;
  load(id: string, trace: NormalizedTrace): Promise<StoreResult<SavedInvestigation>>;
  list(trace: NormalizedTrace): Promise<StoreResult<SavedInvestigation[]>>;
  remove(id: string): Promise<StoreResult<void>>;
}

interface StoredSnapshot {
  id: string;
  payload: string;
}

const failure = (code: InvestigationStoreError["code"], message: string): StoreResult<never> => ({
  ok: false,
  errors: [{ code, message }],
});

const isStoredSnapshot = (value: unknown): value is StoredSnapshot =>
  typeof value === "object" && value !== null &&
  "id" in value && typeof value.id === "string" &&
  "payload" in value && typeof value.payload === "string";

const openDatabase = (factory: IDBFactory): Promise<IDBDatabase> => new Promise((resolve, reject) => {
  let request: IDBOpenDBRequest;
  let blocked = false;
  try {
    request = factory.open(DATABASE_NAME, DATABASE_VERSION);
  } catch {
    reject(new Error("Browser storage could not be opened."));
    return;
  }
  request.onupgradeneeded = () => {
    if (!request.result.objectStoreNames.contains(STORE_NAME)) {
      request.result.createObjectStore(STORE_NAME, { keyPath: "id" });
    }
  };
  request.onsuccess = () => {
    if (blocked) request.result.close();
    else resolve(request.result);
  };
  request.onerror = () => reject(request.error ?? new Error("Browser storage could not be opened."));
  request.onblocked = () => {
    blocked = true;
    reject(new Error("Browser storage is blocked by another tab."));
  };
});

const transact = async <T>(
  factory: IDBFactory,
  mode: IDBTransactionMode,
  operation: (store: IDBObjectStore, resolve: (value: T) => void, reject: (reason?: unknown) => void) => void,
): Promise<T> => {
  const database = await openDatabase(factory);
  return new Promise<T>((resolve, reject) => {
    let transaction: IDBTransaction;
    try {
      transaction = database.transaction(STORE_NAME, mode);
    } catch (error) {
      database.close();
      reject(error);
      return;
    }

    let settled = false;
    let result: T;
    const fail = (reason?: unknown) => {
      if (settled) return;
      settled = true;
      database.close();
      reject(reason);
    };
    const stage = (value: T) => { result = value; };
    transaction.oncomplete = () => {
      if (settled) return;
      settled = true;
      database.close();
      resolve(result);
    };
    transaction.onerror = () => fail(transaction.error);
    transaction.onabort = () => fail(transaction.error);
    try {
      operation(transaction.objectStore(STORE_NAME), stage, fail);
    } catch (error) {
      try { transaction.abort(); } catch { /* The transaction may already be inactive. */ }
      fail(error);
    }
  });
};

const storageFailure = (): StoreResult<never> =>
  failure("storage-error", "Browser storage failed. The investigation could not be loaded or changed.");

/** Local-only snapshots; no trace contents are stored or sent to a server. */
export const createInvestigationStore = (factory: IDBFactory | undefined = globalThis.indexedDB): InvestigationStore => {
  const run = async <T>(work: (available: IDBFactory) => Promise<T>): Promise<StoreResult<T>> => {
    if (!factory) return failure("unavailable", "Browser storage is not available in this environment.");
    try {
      return { ok: true, value: await work(factory) };
    } catch {
      return storageFailure();
    }
  };

  return {
    async save(input) {
      const created = createInvestigation(input);
      if (!created.ok) return created;
      const payload = serializeInvestigation(created.investigation);
      if (new TextEncoder().encode(payload).byteLength > MAX_INVESTIGATION_BYTES) {
        return { ok: false, errors: [{ code: "too-large", message: "Investigation exceeds the 64 KiB limit." }] };
      }
      const written = await run((available) => transact<void>(available, "readwrite", (store) => {
        store.put({ id: created.investigation.id, payload } satisfies StoredSnapshot);
      }));
      return written.ok ? { ok: true, value: created.investigation } : written;
    },
    async load(id, trace) {
      if (id.trim() === "") return failure("not-found", "No investigation was found for that ID.");
      const read = await run((available) => transact<unknown>(available, "readonly", (store, stage, reject) => {
        const request = store.get(id);
        request.onsuccess = () => stage(request.result as unknown);
        request.onerror = () => reject(request.error);
      }));
      if (!read.ok) return read;
      if (read.value === undefined) return failure("not-found", "No investigation was found for that ID.");
      if (!isStoredSnapshot(read.value) || read.value.id !== id) return storageFailure();
      const parsed = parseInvestigation(read.value.payload, trace);
      return parsed.ok ? { ok: true, value: parsed.investigation } : parsed;
    },
    async list(trace) {
      const read = await run((available) => transact<unknown>(available, "readonly", (store, stage, reject) => {
        const request = store.getAll();
        request.onsuccess = () => stage(request.result as unknown);
        request.onerror = () => reject(request.error);
      }));
      if (!read.ok) return read;
      if (!Array.isArray(read.value)) return storageFailure();
      const investigations: SavedInvestigation[] = [];
      for (const value of read.value) {
        if (!isStoredSnapshot(value)) return storageFailure();
        const parsed = parseInvestigation(value.payload, trace);
        if (!parsed.ok) {
          if (parsed.errors.some(({ code }) => code === "trace-mismatch")) continue;
          return parsed;
        }
        if (parsed.investigation.id !== value.id) return storageFailure();
        investigations.push(parsed.investigation);
      }
      investigations.sort((a, b) => b.savedAt.localeCompare(a.savedAt) || a.id.localeCompare(b.id));
      return { ok: true, value: investigations };
    },
    async remove(id) {
      if (id.trim() === "") return failure("not-found", "No investigation was found for that ID.");
      return run((available) => transact<void>(available, "readwrite", (store) => {
        store.delete(id);
      }));
    },
  };
};
