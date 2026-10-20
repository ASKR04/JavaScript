import type {
  CaptureOutcome,
  CaptureReview,
  ReviewAttribute,
  ReviewEvent,
} from "./review-model";

export const TRACE_RELAY_SCHEMA_VERSION = "1.0" as const;

export const CAPTURE_EVENT_TYPES = [
  "user.action",
  "state.transition",
  "network.request",
  "network.response",
  "ui.render",
  "workflow.outcome",
] as const;

export type CaptureEventType = (typeof CAPTURE_EVENT_TYPES)[number];
export type CaptureAttribute = string | number | boolean | null;
export type CaptureState = "idle" | "recording" | "stopped";

export type CaptureEventInput = {
  actor: string;
  type: CaptureEventType;
  message: string;
  outcome?: CaptureOutcome;
  durationMs?: number;
  parentId?: string;
  attributes?: Readonly<Record<string, unknown>>;
};

export type PrivacyPolicy = {
  allowKeys?: readonly string[];
  maskKeys?: readonly string[];
  maskValue?: string;
};

export type CaptureLimits = {
  maxEvents: number;
};

export type CaptureMetadata = {
  traceId: string;
  sessionId: string;
  startedAt: string;
};

export type ProtectedCaptureEvent = {
  id: string;
  sessionId: string;
  timestamp: string;
  offsetMs: number;
  actor: string;
  type: CaptureEventType;
  message: string;
  outcome: CaptureOutcome;
  durationMs?: number;
  parentId?: string;
  reviewAttributes: readonly ReviewAttribute[];
  attributes: Readonly<Record<string, CaptureAttribute>>;
};

export type CaptureSnapshot = CaptureMetadata & {
  state: Exclude<CaptureState, "idle">;
  stoppedAt?: string;
  events: readonly ProtectedCaptureEvent[];
  droppedEventCount: number;
};

export type EventWeaveEvent = {
  id: string;
  sessionId: string;
  timestamp: string;
  type: CaptureEventType;
  actor: string;
  message: string;
  outcome: CaptureOutcome;
  durationMs?: number;
  parentId?: string;
  attributes?: Readonly<Record<string, CaptureAttribute>>;
};

export type EventWeaveTrace = {
  schemaVersion: typeof TRACE_RELAY_SCHEMA_VERSION;
  events: readonly EventWeaveEvent[];
};

export class CaptureStateError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CaptureStateError";
  }
}

export class CaptureValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CaptureValidationError";
  }
}

export class CaptureLimitError extends Error {
  constructor(readonly limit: number) {
    super(`Capture reached its ${limit}-event limit.`);
    this.name = "CaptureLimitError";
  }
}

type CaptureCoreOptions = {
  privacy?: PrivacyPolicy;
  limits?: Partial<CaptureLimits>;
  now?: () => number;
  createId?: () => string;
};

const DEFAULT_MAX_EVENTS = 2_000;
const MAX_EVENTWEAVE_EVENTS = 20_000;
const MASKED_VALUE = "••••";

const sensitiveKeyFragments = [
  "authorization",
  "cookie",
  "password",
  "passcode",
  "token",
  "secret",
  "payment",
  "bankaccount",
  "routingnumber",
  "iban",
  "card",
  "cardnumber",
  "securitycode",
  "cvv",
  "cvc",
];

function normalizeKey(key: string) {
  return key.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function isSensitiveKey(key: string) {
  const normalized = normalizeKey(key);
  return normalized === "pin" || sensitiveKeyFragments.some((fragment) => normalized.includes(fragment));
}

function assertNonEmpty(value: string, field: string) {
  if (value.length === 0 || value.trim() !== value) {
    throw new CaptureValidationError(`${field} must be a non-empty, unpadded string.`);
  }
}

function isCaptureAttribute(value: unknown): value is CaptureAttribute {
  return (
    value === null ||
    typeof value === "string" ||
    typeof value === "boolean" ||
    (typeof value === "number" && Number.isFinite(value))
  );
}

function cloneReviewAttribute(attribute: ReviewAttribute): ReviewAttribute {
  return { ...attribute };
}

function cloneEvent(event: ProtectedCaptureEvent): ProtectedCaptureEvent {
  return {
    ...event,
    reviewAttributes: event.reviewAttributes.map(cloneReviewAttribute),
    attributes: { ...event.attributes },
  };
}

function protectAttributes(
  attributes: Readonly<Record<string, unknown>>,
  policy: PrivacyPolicy,
): { review: ReviewAttribute[]; approved: Record<string, CaptureAttribute> } {
  const allowedKeys = new Set((policy.allowKeys ?? []).map(normalizeKey));
  const maskedKeys = new Set((policy.maskKeys ?? []).map(normalizeKey));
  const maskValue = policy.maskValue ?? MASKED_VALUE;
  const review: ReviewAttribute[] = [];
  const approved: Record<string, CaptureAttribute> = {};

  for (const key of Object.keys(attributes).sort()) {
    assertNonEmpty(key, "Attribute key");
    const normalizedKey = normalizeKey(key);
    const value = attributes[key];

    if (isSensitiveKey(key) || !allowedKeys.has(normalizedKey) || !isCaptureAttribute(value)) {
      review.push({ key, value: "Removed before review", treatment: "removed" });
      continue;
    }

    if (maskedKeys.has(normalizedKey)) {
      approved[key] = maskValue;
      review.push({ key, value: maskValue, treatment: "masked" });
      continue;
    }

    approved[key] = value;
    review.push({ key, value: String(value), treatment: "allowed" });
  }

  return { review, approved };
}

function defaultId() {
  return globalThis.crypto.randomUUID();
}

export class CaptureCore {
  private readonly privacy: PrivacyPolicy;
  private readonly limits: CaptureLimits;
  private readonly now: () => number;
  private readonly createId: () => string;
  private stateValue: CaptureState = "idle";
  private metadata?: CaptureMetadata;
  private stoppedAt?: string;
  private events: ProtectedCaptureEvent[] = [];
  private acceptedIds = new Set<string>();
  private droppedEventCount = 0;
  private lastTimestampMs = 0;

  constructor(options: CaptureCoreOptions = {}) {
    const maxEvents = options.limits?.maxEvents ?? DEFAULT_MAX_EVENTS;
    if (!Number.isInteger(maxEvents) || maxEvents < 1 || maxEvents > MAX_EVENTWEAVE_EVENTS) {
      throw new CaptureValidationError(
        `maxEvents must be an integer from 1 to ${MAX_EVENTWEAVE_EVENTS}.`,
      );
    }

    this.privacy = options.privacy ?? {};
    this.limits = { maxEvents };
    this.now = options.now ?? Date.now;
    this.createId = options.createId ?? defaultId;
  }

  get state(): CaptureState {
    return this.stateValue;
  }

  start(): CaptureMetadata {
    if (this.stateValue === "recording") {
      throw new CaptureStateError("Stop the active capture before starting another one.");
    }

    const startedAtMs = this.readTime();
    this.metadata = {
      traceId: this.generateId("trace"),
      sessionId: this.generateId("session"),
      startedAt: new Date(startedAtMs).toISOString(),
    };
    this.stateValue = "recording";
    this.stoppedAt = undefined;
    this.events = [];
    this.acceptedIds = new Set();
    this.droppedEventCount = 0;
    this.lastTimestampMs = startedAtMs;
    return { ...this.metadata };
  }

  record(input: CaptureEventInput): ProtectedCaptureEvent {
    if (this.stateValue !== "recording" || !this.metadata) {
      throw new CaptureStateError("Start capture before recording an event.");
    }

    this.validateEvent(input);
    if (this.events.length >= this.limits.maxEvents) {
      this.droppedEventCount += 1;
      throw new CaptureLimitError(this.limits.maxEvents);
    }

    const id = this.generateId("event");
    if (this.acceptedIds.has(id)) {
      throw new CaptureValidationError(`Generated duplicate event ID: ${id}`);
    }
    if (input.parentId && !this.acceptedIds.has(input.parentId)) {
      throw new CaptureValidationError(
        `parentId must reference an earlier accepted event in this capture: ${input.parentId}`,
      );
    }

    const capturedAtMs = Math.max(this.readTime(), this.lastTimestampMs);
    this.lastTimestampMs = capturedAtMs;
    const protectedAttributes = protectAttributes(input.attributes ?? {}, this.privacy);
    const event: ProtectedCaptureEvent = {
      id,
      sessionId: this.metadata.sessionId,
      timestamp: new Date(capturedAtMs).toISOString(),
      offsetMs: capturedAtMs - Date.parse(this.metadata.startedAt),
      actor: input.actor,
      type: input.type,
      message: input.message,
      outcome: input.outcome ?? "unknown",
      ...(input.durationMs === undefined ? {} : { durationMs: input.durationMs }),
      ...(input.parentId === undefined ? {} : { parentId: input.parentId }),
      reviewAttributes: protectedAttributes.review,
      attributes: protectedAttributes.approved,
    };

    this.events.push(event);
    this.acceptedIds.add(id);
    return cloneEvent(event);
  }

  stop(): CaptureSnapshot {
    if (this.stateValue !== "recording") {
      throw new CaptureStateError("Only an active capture can be stopped.");
    }
    this.stateValue = "stopped";
    this.stoppedAt = new Date(Math.max(this.readTime(), this.lastTimestampMs)).toISOString();
    return this.snapshot();
  }

  snapshot(): CaptureSnapshot {
    if (this.stateValue === "idle" || !this.metadata) {
      throw new CaptureStateError("Start capture before requesting a snapshot.");
    }
    return {
      ...this.metadata,
      state: this.stateValue,
      ...(this.stoppedAt === undefined ? {} : { stoppedAt: this.stoppedAt }),
      events: this.events.map(cloneEvent),
      droppedEventCount: this.droppedEventCount,
    };
  }

  toReview(name: string): CaptureReview {
    assertNonEmpty(name, "Capture name");
    const snapshot = this.snapshot();
    const events: ReviewEvent[] = snapshot.events.map((event) => ({
      id: event.id,
      ...(event.parentId === undefined ? {} : { parentId: event.parentId }),
      offsetMs: event.offsetMs,
      ...(event.durationMs === undefined ? {} : { durationMs: event.durationMs }),
      actor: event.actor,
      type: event.type,
      name: event.message,
      outcome: event.outcome,
      attributes: event.reviewAttributes.map(cloneReviewAttribute),
    }));
    return { name, traceId: snapshot.traceId, sessionId: snapshot.sessionId, events };
  }

  toEventWeaveTrace(): EventWeaveTrace {
    if (this.stateValue !== "stopped") {
      throw new CaptureStateError("Stop capture before creating an EventWeave trace.");
    }
    const snapshot = this.snapshot();
    if (snapshot.events.length === 0) {
      throw new CaptureValidationError("Record at least one event before creating a trace.");
    }
    return {
      schemaVersion: TRACE_RELAY_SCHEMA_VERSION,
      events: snapshot.events.map((event) => ({
        id: event.id,
        sessionId: event.sessionId,
        timestamp: event.timestamp,
        type: event.type,
        actor: event.actor,
        message: event.message,
        outcome: event.outcome,
        ...(event.durationMs === undefined ? {} : { durationMs: event.durationMs }),
        ...(event.parentId === undefined ? {} : { parentId: event.parentId }),
        ...(Object.keys(event.attributes).length === 0
          ? {}
          : { attributes: { ...event.attributes } }),
      })),
    };
  }

  toJson(): string {
    return `${JSON.stringify(this.toEventWeaveTrace(), null, 2)}\n`;
  }

  toNdjson(): string {
    return this.toEventWeaveTrace().events.map((event) => JSON.stringify(event)).join("\n") + "\n";
  }

  private validateEvent(input: CaptureEventInput) {
    assertNonEmpty(input.actor, "actor");
    assertNonEmpty(input.message, "message");
    if (!CAPTURE_EVENT_TYPES.includes(input.type)) {
      throw new CaptureValidationError(`Unsupported capture event type: ${input.type}`);
    }
    if (input.durationMs !== undefined && (!Number.isFinite(input.durationMs) || input.durationMs < 0)) {
      throw new CaptureValidationError("durationMs must be a non-negative finite number.");
    }
    if (input.parentId !== undefined) assertNonEmpty(input.parentId, "parentId");
  }

  private readTime() {
    const value = this.now();
    if (!Number.isFinite(value) || Number.isNaN(new Date(value).getTime())) {
      throw new CaptureValidationError("The capture clock must return a finite timestamp.");
    }
    return value;
  }

  private generateId(prefix: "trace" | "session" | "event") {
    const value = this.createId();
    assertNonEmpty(value, `${prefix} ID seed`);
    return `${prefix}_${value}`;
  }
}
