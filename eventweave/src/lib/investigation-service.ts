import type { EventFilters } from "./event-filters";
import type { InvestigationStore, StoreResult } from "./investigation-store";
import type { SavedInvestigation } from "./investigation-persistence";
import type { NormalizedTrace } from "./trace-model";

export interface SaveInvestigationRequest {
  name: string;
  trace: NormalizedTrace;
  sessionId: string;
  eventId: string;
  filters: EventFilters;
}

export interface InvestigationSummary {
  id: string;
  name: string;
  savedAt: string;
  sessionId: string;
  eventId: string;
}

export interface RestoredInvestigation extends InvestigationSummary {
  filters: EventFilters;
}

export interface InvestigationService {
  save(request: SaveInvestigationRequest): Promise<StoreResult<InvestigationSummary>>;
  list(trace: NormalizedTrace): Promise<StoreResult<InvestigationSummary[]>>;
  restore(id: string, trace: NormalizedTrace): Promise<StoreResult<RestoredInvestigation>>;
  remove(id: string): Promise<StoreResult<void>>;
}

export interface InvestigationServiceDependencies {
  createId: () => string;
  now: () => string;
}

const defaultDependencies: InvestigationServiceDependencies = {
  createId: () => globalThis.crypto?.randomUUID?.() ??
    `investigation-${Date.now().toString(36)}-${Math.random().toString(16).slice(2)}`,
  now: () => new Date().toISOString(),
};

const toSummary = (investigation: SavedInvestigation): InvestigationSummary => ({
  id: investigation.id,
  name: investigation.name,
  savedAt: investigation.savedAt,
  sessionId: investigation.selection.sessionId,
  eventId: investigation.selection.eventId,
});

const toRestoredInvestigation = (investigation: SavedInvestigation): RestoredInvestigation => ({
  ...toSummary(investigation),
  filters: { ...investigation.filters },
});

const mapResult = <T, U>(result: StoreResult<T>, select: (value: T) => U): StoreResult<U> =>
  result.ok ? { ok: true, value: select(result.value) } : result;

/**
 * Keeps React-facing investigation state separate from serialized snapshots and
 * storage details. The store remains responsible for runtime and trace validation.
 */
export const createInvestigationService = (
  store: InvestigationStore,
  dependencies: InvestigationServiceDependencies = defaultDependencies,
): InvestigationService => ({
  async save(request) {
    const result = await store.save({
      id: dependencies.createId(),
      name: request.name,
      savedAt: dependencies.now(),
      trace: request.trace,
      sessionId: request.sessionId,
      eventId: request.eventId,
      filters: { ...request.filters },
    });
    return mapResult(result, toSummary);
  },

  async list(trace) {
    const result = await store.list(trace);
    return mapResult(result, (investigations) => investigations.map(toSummary));
  },

  async restore(id, trace) {
    const result = await store.load(id, trace);
    return mapResult(result, toRestoredInvestigation);
  },

  remove: (id) => store.remove(id),
});
