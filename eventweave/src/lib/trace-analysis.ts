import type { NormalizedTrace, TraceEvent, TraceRelation } from "./trace-model";

export interface CausalChain {
  focus: TraceEvent;
  ancestors: TraceEvent[];
  descendants: TraceEvent[];
  relations: TraceRelation[];
}

/**
 * Selects the explicit parent chain around one event. Sequence relations remain
 * timeline context and are intentionally excluded from causal evidence.
 */
export const selectCausalChain = (
  trace: NormalizedTrace,
  focusEventId: string,
): CausalChain | undefined => {
  const eventsById = new Map(trace.events.map((event) => [event.id, event]));
  const focus = eventsById.get(focusEventId);
  if (!focus) return undefined;

  const ancestorIds = new Set<string>();
  let current = focus;
  while (current.parentId) {
    if (ancestorIds.has(current.parentId) || current.parentId === focus.id) break;
    const parent = eventsById.get(current.parentId);
    if (!parent) break;
    ancestorIds.add(parent.id);
    current = parent;
  }

  const childrenById = new Map<string, string[]>();
  trace.events.forEach((event) => {
    if (!event.parentId) return;
    const children = childrenById.get(event.parentId) ?? [];
    children.push(event.id);
    childrenById.set(event.parentId, children);
  });

  const descendantIds = new Set<string>();
  const pending = [...(childrenById.get(focus.id) ?? [])];
  let pendingIndex = 0;
  while (pendingIndex < pending.length) {
    const eventId = pending[pendingIndex];
    pendingIndex += 1;
    if (eventId === focus.id || descendantIds.has(eventId)) continue;
    descendantIds.add(eventId);
    pending.push(...(childrenById.get(eventId) ?? []));
  }

  const chainIds = new Set([...ancestorIds, focus.id, ...descendantIds]);
  return {
    focus,
    ancestors: trace.events.filter((event) => ancestorIds.has(event.id)),
    descendants: trace.events.filter((event) => descendantIds.has(event.id)),
    relations: trace.relations.filter(
      (relation) =>
        relation.kind === "parent" &&
        chainIds.has(relation.fromEventId) &&
        chainIds.has(relation.toEventId),
    ),
  };
};
