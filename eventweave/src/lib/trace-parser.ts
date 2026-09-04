import {
  TRACE_SCHEMA_VERSION,
  type NormalizedTrace,
  type TraceAttribute,
  type TraceEvent,
  type TraceOutcome,
  type TraceRelation,
  type TraceSession,
} from "./trace-model";

export const DEFAULT_IMPORT_LIMITS = {
  maxBytes: 2 * 1024 * 1024,
  maxEvents: 20_000,
} as const;

export type TraceFormat = "json" | "ndjson";

export interface TraceImportError {
  code:
    | "empty-file"
    | "file-too-large"
    | "invalid-json"
    | "unsupported-version"
    | "invalid-event"
    | "duplicate-event"
    | "missing-parent"
    | "too-many-events";
  message: string;
  line?: number;
  eventId?: string;
}

export type TraceImportResult =
  | { ok: true; trace: NormalizedTrace; format: TraceFormat }
  | { ok: false; errors: TraceImportError[]; format: TraceFormat };

export interface TraceImportOptions {
  format?: TraceFormat;
  maxBytes?: number;
  maxEvents?: number;
  importedAt?: string;
}

interface RawTraceEnvelope {
  schemaVersion: unknown;
  events: unknown;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const isTraceAttribute = (value: unknown): value is TraceAttribute =>
  value === null || ["string", "number", "boolean"].includes(typeof value);

const ISO_INSTANT_PATTERN =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/;

const readRequiredText = (
  record: Record<string, unknown>,
  key: string,
  errors: string[],
): string => {
  const value = record[key];
  if (typeof value !== "string" || value.trim() === "") {
    errors.push(`\`${key}\` must be a non-empty string`);
    return "";
  }

  if (value !== value.trim()) {
    errors.push(`\`${key}\` cannot have surrounding whitespace`);
  }

  return value;
};

const readOutcome = (value: unknown, errors: string[]): TraceOutcome => {
  if (value === undefined) return "unknown";
  if (value === "success" || value === "failure" || value === "unknown") {
    return value;
  }
  errors.push("`outcome` must be success, failure, or unknown");
  return "unknown";
};

const validateEvent = (
  value: unknown,
  position: number,
  line?: number,
): { event?: TraceEvent; errors: TraceImportError[] } => {
  if (!isRecord(value)) {
    return {
      errors: [{ code: "invalid-event", message: `Event ${position} must be an object.`, line }],
    };
  }

  const fieldErrors: string[] = [];
  const id = readRequiredText(value, "id", fieldErrors);
  const sessionId = readRequiredText(value, "sessionId", fieldErrors);
  const timestamp = readRequiredText(value, "timestamp", fieldErrors);
  const type = readRequiredText(value, "type", fieldErrors);
  const actor = readRequiredText(value, "actor", fieldErrors);
  const message = readRequiredText(value, "message", fieldErrors);
  const timestampMs = Date.parse(timestamp);

  if (timestamp && (!ISO_INSTANT_PATTERN.test(timestamp) || !Number.isFinite(timestampMs))) {
    fieldErrors.push("`timestamp` must be a valid ISO 8601 date-time with an offset");
  }

  const durationMs = value.durationMs;
  if (
    durationMs !== undefined &&
    (typeof durationMs !== "number" || !Number.isFinite(durationMs) || durationMs < 0)
  ) {
    fieldErrors.push("`durationMs` must be a non-negative finite number");
  }

  const parentId = value.parentId;
  if (
    parentId !== undefined &&
    (typeof parentId !== "string" || parentId.trim() === "" || parentId !== parentId.trim())
  ) {
    fieldErrors.push("`parentId` must be a non-empty, unpadded string");
  }

  const attributesValue = value.attributes ?? {};
  if (!isRecord(attributesValue)) {
    fieldErrors.push("`attributes` must be an object of primitive values");
  }
  const attributes: Record<string, TraceAttribute> = {};
  if (isRecord(attributesValue)) {
    Object.entries(attributesValue).forEach(([key, attribute]) => {
      if (key.trim() === "" || key !== key.trim() || !isTraceAttribute(attribute)) {
        fieldErrors.push("`attributes` keys must be unpadded and values must be primitive");
        return;
      }
      attributes[key] = attribute;
    });
  }

  const outcome = readOutcome(value.outcome, fieldErrors);

  if (fieldErrors.length > 0) {
    return {
      errors: [
        {
          code: "invalid-event",
          message: `Event ${position}: ${fieldErrors.join("; ")}.`,
          line,
          eventId: id || undefined,
        },
      ],
    };
  }

  return {
    event: {
      id,
      sessionId,
      timestamp,
      timestampMs,
      type,
      actor,
      message,
      ...(durationMs === undefined ? {} : { durationMs: durationMs as number }),
      outcome,
      ...(parentId === undefined ? {} : { parentId: parentId as string }),
      attributes,
    },
    errors: [],
  };
};

const parseJson = (text: string): { events?: unknown[]; errors: TraceImportError[] } => {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch (error) {
    const detail = error instanceof Error ? error.message : "Unknown JSON error";
    return { errors: [{ code: "invalid-json", message: `JSON could not be parsed: ${detail}` }] };
  }

  if (!isRecord(parsed)) {
    return {
      errors: [{ code: "invalid-json", message: "JSON traces must use an object envelope." }],
    };
  }

  const envelope = parsed as unknown as RawTraceEnvelope;
  if (envelope.schemaVersion !== TRACE_SCHEMA_VERSION) {
    return {
      errors: [
        {
          code: "unsupported-version",
          message: `Expected schema version ${TRACE_SCHEMA_VERSION}.`,
        },
      ],
    };
  }

  if (!Array.isArray(envelope.events)) {
    return {
      errors: [{ code: "invalid-json", message: "`events` must be an array." }],
    };
  }

  return { events: envelope.events, errors: [] };
};

const parseNdjson = (
  text: string,
): { events?: Array<{ value: unknown; line: number }>; errors: TraceImportError[] } => {
  const events: Array<{ value: unknown; line: number }> = [];
  const errors: TraceImportError[] = [];

  text.split(/\r?\n/).forEach((rawLine, index) => {
    if (rawLine.trim() === "") return;
    try {
      events.push({ value: JSON.parse(rawLine), line: index + 1 });
    } catch (error) {
      const detail = error instanceof Error ? error.message : "Unknown JSON error";
      errors.push({
        code: "invalid-json",
        message: `Line ${index + 1} could not be parsed: ${detail}`,
        line: index + 1,
      });
    }
  });

  return errors.length > 0 ? { errors } : { events, errors: [] };
};

const deriveOutcome = (events: TraceEvent[]): TraceOutcome => {
  if (events.some((event) => event.outcome === "failure")) return "failure";
  if (events.some((event) => event.outcome === "unknown")) return "unknown";
  return "success";
};

const normalizeTrace = (events: TraceEvent[], importedAt: string): NormalizedTrace => {
  const orderedEvents = [...events].sort(
    (left, right) => left.timestampMs - right.timestampMs || left.id.localeCompare(right.id),
  );
  const sessionsById = new Map<string, TraceEvent[]>();

  orderedEvents.forEach((event) => {
    const sessionEvents = sessionsById.get(event.sessionId) ?? [];
    sessionEvents.push(event);
    sessionsById.set(event.sessionId, sessionEvents);
  });

  const sessions: TraceSession[] = [...sessionsById.entries()]
    .map(([id, sessionEvents]) => {
      const first = sessionEvents[0];
      const last = sessionEvents[sessionEvents.length - 1];
      return {
        id,
        startTime: first.timestamp,
        endTime: last.timestamp,
        durationMs: Math.max(0, last.timestampMs + (last.durationMs ?? 0) - first.timestampMs),
        outcome: deriveOutcome(sessionEvents),
        eventIds: sessionEvents.map((event) => event.id),
      };
    })
    .sort((left, right) => Date.parse(left.startTime) - Date.parse(right.startTime));

  const relations: TraceRelation[] = [];
  sessions.forEach((session) => {
    session.eventIds.slice(1).forEach((eventId, index) => {
      relations.push({ fromEventId: session.eventIds[index], toEventId: eventId, kind: "sequence" });
    });
  });
  orderedEvents.forEach((event) => {
    if (event.parentId) {
      relations.push({ fromEventId: event.parentId, toEventId: event.id, kind: "parent" });
    }
  });

  return {
    schemaVersion: TRACE_SCHEMA_VERSION,
    importedAt,
    sessions,
    events: orderedEvents,
    relations,
  };
};

export const detectTraceFormat = (fileName?: string): TraceFormat =>
  fileName?.toLowerCase().endsWith(".ndjson") || fileName?.toLowerCase().endsWith(".jsonl")
    ? "ndjson"
    : "json";

export const parseTraceText = (
  text: string,
  options: TraceImportOptions = {},
): TraceImportResult => {
  const format = options.format ?? "json";
  const maxBytes = options.maxBytes ?? DEFAULT_IMPORT_LIMITS.maxBytes;
  const maxEvents = options.maxEvents ?? DEFAULT_IMPORT_LIMITS.maxEvents;

  if (text.trim() === "") {
    return { ok: false, format, errors: [{ code: "empty-file", message: "The trace is empty." }] };
  }

  if (new TextEncoder().encode(text).byteLength > maxBytes) {
    return {
      ok: false,
      format,
      errors: [{ code: "file-too-large", message: `The trace exceeds the ${maxBytes}-byte limit.` }],
    };
  }

  const parsed = format === "json" ? parseJson(text) : parseNdjson(text);
  if (parsed.errors.length > 0 || !parsed.events) {
    return { ok: false, format, errors: parsed.errors };
  }

  if (parsed.events.length > maxEvents) {
    return {
      ok: false,
      format,
      errors: [{ code: "too-many-events", message: `The trace exceeds the ${maxEvents}-event limit.` }],
    };
  }

  const events: TraceEvent[] = [];
  const errors: TraceImportError[] = [];
  parsed.events.forEach((entry, index) => {
    const hasLine = isRecord(entry) && "value" in entry && "line" in entry;
    const value = hasLine ? entry.value : entry;
    const line = hasLine && typeof entry.line === "number" ? entry.line : undefined;
    const validated = validateEvent(value, index + 1, line);
    errors.push(...validated.errors);
    if (validated.event) events.push(validated.event);
  });

  const seenIds = new Set<string>();
  events.forEach((event) => {
    if (seenIds.has(event.id)) {
      errors.push({
        code: "duplicate-event",
        message: `Event ID \`${event.id}\` is duplicated.`,
        eventId: event.id,
      });
    }
    seenIds.add(event.id);
  });

  events.forEach((event) => {
    if (event.parentId && !seenIds.has(event.parentId)) {
      errors.push({
        code: "missing-parent",
        message: `Event \`${event.id}\` references missing parent \`${event.parentId}\`.`,
        eventId: event.id,
      });
    }
  });

  if (errors.length > 0) return { ok: false, format, errors };

  return {
    ok: true,
    format,
    trace: normalizeTrace(events, options.importedAt ?? new Date().toISOString()),
  };
};
