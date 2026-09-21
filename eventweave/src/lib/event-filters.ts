import type { TraceEvent, TraceOutcome } from "./trace-model";
import type { TimelineEvent } from "./timeline-view";

export interface EventFilters {
  actor: string;
  type: string;
  outcome: TraceOutcome | "all";
  minimumDurationMs?: number;
}

export const EMPTY_EVENT_FILTERS: EventFilters = {
  actor: "",
  type: "",
  outcome: "all",
};

export interface EventFilterOptions {
  actors: string[];
  types: string[];
}

export const eventFilterOptions = (events: readonly TimelineEvent[]): EventFilterOptions => ({
  actors: [...new Set(events.map(({ event }) => event.actor))].sort((left, right) => left.localeCompare(right)),
  types: [...new Set(events.map(({ event }) => event.type))].sort((left, right) => left.localeCompare(right)),
});

export const matchesEventFilters = (event: TraceEvent, filters: EventFilters): boolean =>
  (filters.actor === "" || event.actor === filters.actor) &&
  (filters.type === "" || event.type === filters.type) &&
  (filters.outcome === "all" || event.outcome === filters.outcome) &&
  (filters.minimumDurationMs === undefined ||
    (event.durationMs !== undefined && event.durationMs >= filters.minimumDurationMs));

/** Filtering preserves canonical timeline order and never mutates the imported trace. */
export const filterTimelineEvents = (
  events: readonly TimelineEvent[],
  filters: EventFilters,
): TimelineEvent[] => events.filter(({ event }) => matchesEventFilters(event, filters));

export const hasEventFilters = (filters: EventFilters): boolean =>
  filters.actor !== "" || filters.type !== "" || filters.outcome !== "all" || filters.minimumDurationMs !== undefined;
