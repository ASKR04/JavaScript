import type { NormalizedTrace, TraceOutcome } from "./trace-model";

export const INVESTIGATION_SCHEMA_VERSION = 1 as const;
export const MAX_INVESTIGATION_BYTES = 64 * 1024;

export interface SavedEventFilters {
  actor: string;
  type: string;
  outcome: TraceOutcome | "all";
  minimumDurationMs?: number;
}

export interface SavedInvestigation {
  version: typeof INVESTIGATION_SCHEMA_VERSION;
  id: string;
  name: string;
  savedAt: string;
  traceFingerprint: string;
  selection: {
    sessionId: string;
    eventId: string;
  };
  filters: SavedEventFilters;
}

export interface InvestigationInput {
  id: string;
  name: string;
  savedAt: string;
  trace: NormalizedTrace;
  sessionId: string;
  eventId: string;
  filters?: Partial<SavedEventFilters>;
}

export interface InvestigationError {
  code: "too-large" | "invalid-json" | "invalid-shape" | "unsupported-version" | "trace-mismatch" | "stale-selection";
  message: string;
}

export type InvestigationResult =
  | { ok: true; investigation: SavedInvestigation }
  | { ok: false; errors: InvestigationError[] };

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const isAbsoluteTimestamp = (value: string): boolean =>
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.test(value) &&
  Number.isFinite(Date.parse(value));

const fingerprintText = (trace: NormalizedTrace): string => JSON.stringify({
  schemaVersion: trace.schemaVersion,
  sessions: trace.sessions.map(({ id, eventIds }) => [id, eventIds]),
  events: trace.events.map(({ id, sessionId, timestamp }) => [id, sessionId, timestamp]),
});

/** A small deterministic fingerprint for stale-trace detection, not a security hash. */
export const fingerprintTrace = (trace: NormalizedTrace): string => {
  let hash = 2_166_136_261;
  for (const character of fingerprintText(trace)) {
    hash = Math.imul(hash ^ character.charCodeAt(0), 16_777_619) >>> 0;
  }
  return `ew1-${hash.toString(16).padStart(8, "0")}-${trace.events.length}`;
};

const validateText = (value: unknown, label: string, maximum: number, errors: InvestigationError[]): value is string => {
  if (typeof value !== "string" || value.trim() === "" || value !== value.trim() || value.length > maximum) {
    errors.push({ code: "invalid-shape", message: `${label} must be a trimmed non-empty string no longer than ${maximum} characters.` });
    return false;
  }
  return true;
};

const validateSnapshot = (value: unknown, trace: NormalizedTrace): InvestigationResult => {
  if (!isRecord(value)) return { ok: false, errors: [{ code: "invalid-shape", message: "Investigation data must be an object." }] };
  if (value.version !== INVESTIGATION_SCHEMA_VERSION) {
    return { ok: false, errors: [{ code: "unsupported-version", message: `Investigation version ${String(value.version)} is not supported.` }] };
  }

  const errors: InvestigationError[] = [];
  validateText(value.id, "Investigation ID", 100, errors);
  validateText(value.name, "Investigation name", 120, errors);
  if (typeof value.savedAt !== "string" || !isAbsoluteTimestamp(value.savedAt)) {
    errors.push({ code: "invalid-shape", message: "Saved time must be a valid absolute ISO 8601 timestamp." });
  }
  if (typeof value.traceFingerprint !== "string") {
    errors.push({ code: "invalid-shape", message: "Trace fingerprint must be a string." });
  } else if (value.traceFingerprint !== fingerprintTrace(trace)) {
    errors.push({ code: "trace-mismatch", message: "This investigation belongs to a different or changed trace." });
  }

  if (!isRecord(value.selection)) {
    errors.push({ code: "invalid-shape", message: "Investigation selection must be an object." });
  } else {
    const { sessionId, eventId } = value.selection;
    if (typeof sessionId !== "string" || typeof eventId !== "string") {
      errors.push({ code: "invalid-shape", message: "Selection requires string session and event IDs." });
    } else {
      const session = trace.sessions.find(({ id }) => id === sessionId);
      if (!session?.eventIds.includes(eventId)) {
        errors.push({ code: "stale-selection", message: "The saved event is not part of the saved session in this trace." });
      }
    }
  }

  if (!isRecord(value.filters)) {
    errors.push({ code: "invalid-shape", message: "Investigation filters must be an object." });
  } else {
    const { actor, type, outcome, minimumDurationMs } = value.filters;
    if (typeof actor !== "string" || actor.length > 100 || typeof type !== "string" || type.length > 100) {
      errors.push({ code: "invalid-shape", message: "Actor and type filters must be strings no longer than 100 characters." });
    }
    if (outcome !== "all" && outcome !== "success" && outcome !== "failure" && outcome !== "unknown") {
      errors.push({ code: "invalid-shape", message: "Outcome filter must be all, success, failure, or unknown." });
    }
    if (minimumDurationMs !== undefined &&
      (typeof minimumDurationMs !== "number" || !Number.isFinite(minimumDurationMs) || minimumDurationMs < 0)) {
      errors.push({ code: "invalid-shape", message: "Minimum duration must be a finite non-negative number when present." });
    }
  }

  return errors.length > 0
    ? { ok: false, errors }
    : { ok: true, investigation: value as unknown as SavedInvestigation };
};

export const createInvestigation = (input: InvestigationInput): InvestigationResult => validateSnapshot({
  version: INVESTIGATION_SCHEMA_VERSION,
  id: input.id,
  name: input.name,
  savedAt: input.savedAt,
  traceFingerprint: fingerprintTrace(input.trace),
  selection: { sessionId: input.sessionId, eventId: input.eventId },
  filters: {
    actor: input.filters?.actor ?? "",
    type: input.filters?.type ?? "",
    outcome: input.filters?.outcome ?? "all",
    ...(input.filters?.minimumDurationMs === undefined ? {} : { minimumDurationMs: input.filters.minimumDurationMs }),
  },
}, input.trace);

export const serializeInvestigation = (investigation: SavedInvestigation): string =>
  JSON.stringify(investigation, null, 2);

export const parseInvestigation = (text: string, trace: NormalizedTrace): InvestigationResult => {
  if (new TextEncoder().encode(text).byteLength > MAX_INVESTIGATION_BYTES) {
    return { ok: false, errors: [{ code: "too-large", message: `Investigation data exceeds the ${MAX_INVESTIGATION_BYTES / 1024} KiB limit.` }] };
  }
  try {
    return validateSnapshot(JSON.parse(text) as unknown, trace);
  } catch {
    return { ok: false, errors: [{ code: "invalid-json", message: "Investigation data is not valid JSON." }] };
  }
};
