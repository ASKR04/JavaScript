export const TRACE_SCHEMA_VERSION = "1.0" as const;

export type TraceOutcome = "success" | "failure" | "unknown";

export type TraceAttribute = string | number | boolean | null;

export interface TraceEvent {
  id: string;
  sessionId: string;
  timestamp: string;
  timestampMs: number;
  type: string;
  actor: string;
  message: string;
  durationMs?: number;
  outcome: TraceOutcome;
  parentId?: string;
  attributes: Record<string, TraceAttribute>;
}

export interface TraceRelation {
  fromEventId: string;
  toEventId: string;
  kind: "parent" | "sequence";
}

export interface TraceSession {
  id: string;
  startTime: string;
  endTime: string;
  durationMs: number;
  outcome: TraceOutcome;
  eventIds: string[];
}

export interface NormalizedTrace {
  schemaVersion: typeof TRACE_SCHEMA_VERSION;
  importedAt: string;
  sessions: TraceSession[];
  events: TraceEvent[];
  relations: TraceRelation[];
}
