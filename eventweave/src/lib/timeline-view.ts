import type { NormalizedTrace, TraceEvent, TraceSession } from "./trace-model";

export interface TimelineEvent {
  event: TraceEvent;
  offsetMs: number;
  positionPercent: number;
  widthPercent: number;
}

export interface SessionTimeline {
  session: TraceSession;
  events: TimelineEvent[];
}

const clampPercent = (value: number): number => Math.min(100, Math.max(0, value));

export const buildSessionTimeline = (
  trace: NormalizedTrace,
  sessionId: string,
): SessionTimeline | undefined => {
  const session = trace.sessions.find(({ id }) => id === sessionId);
  if (!session) return undefined;

  const eventsById = new Map(trace.events.map((event) => [event.id, event]));
  const sessionStartMs = Date.parse(session.startTime);
  const scaleMs = Math.max(session.durationMs, 1);

  return {
    session,
    events: session.eventIds.flatMap((eventId) => {
      const event = eventsById.get(eventId);
      if (!event) return [];
      const offsetMs = Math.max(0, event.timestampMs - sessionStartMs);
      const positionPercent = clampPercent((offsetMs / scaleMs) * 100);
      const durationPercent = clampPercent(((event.durationMs ?? 0) / scaleMs) * 100);
      return [{
        event,
        offsetMs,
        positionPercent,
        widthPercent: Math.min(durationPercent, 100 - positionPercent),
      }];
    }),
  };
};

export type TimelineNavigationKey = "ArrowDown" | "ArrowLeft" | "ArrowRight" | "ArrowUp" | "End" | "Home";

export const findTimelineSelection = (
  eventIds: string[],
  selectedId: string,
  key: TimelineNavigationKey,
): string | undefined => {
  if (eventIds.length === 0) return undefined;
  const selectedIndex = eventIds.indexOf(selectedId);
  if (selectedIndex === -1) return eventIds[0];
  const currentIndex = selectedIndex;
  if (key === "Home") return eventIds[0];
  if (key === "End") return eventIds[eventIds.length - 1];
  if (key === "ArrowDown" || key === "ArrowRight") {
    return eventIds[Math.min(eventIds.length - 1, currentIndex + 1)];
  }
  return eventIds[Math.max(0, currentIndex - 1)];
};
