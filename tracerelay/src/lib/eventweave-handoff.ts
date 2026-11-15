import { parseTraceText } from "../../../eventweave/src/lib/trace-parser";
import type { NormalizedTrace } from "../../../eventweave/src/lib/trace-model";
import type { CaptureCore, EventWeaveTrace } from "./capture-core";
import type { CaptureReview } from "./review-model";

export const EVENTWEAVE_HANDOFF_PROTOCOL_VERSION = 1 as const;
export const EVENTWEAVE_HANDOFF_MESSAGE_TYPE = "tracerelay:eventweave-import" as const;

export type HandoffEventPreview = {
  id: string;
  actor: string;
  type: string;
  message: string;
  outcome: string;
  parentId?: string;
  attributes: Readonly<Record<string, string | number | boolean | null>>;
};

export type HandoffDisclosure = {
  traceId: string;
  sessionId: string;
  eventCount: number;
  byteCount: number;
  actors: readonly string[];
  eventTypes: readonly string[];
  removedAttributeCount: number;
  maskedAttributeCount: number;
  events: readonly HandoffEventPreview[];
};

export type EventWeaveHandoffMessage = {
  type: typeof EVENTWEAVE_HANDOFF_MESSAGE_TYPE;
  protocolVersion: typeof EVENTWEAVE_HANDOFF_PROTOCOL_VERSION;
  handoffId: string;
  format: "json";
  content: string;
};

export type PreparedEventWeaveHandoff = {
  message: EventWeaveHandoffMessage;
  disclosure: HandoffDisclosure;
};

export type HandoffValidationResult =
  | { ok: true; message: EventWeaveHandoffMessage; trace: NormalizedTrace }
  | { ok: false; errors: readonly string[] };

export type EventWeaveHandoffTransport = {
  send: (message: EventWeaveHandoffMessage, signal: AbortSignal) => Promise<void>;
};

export type HandoffSessionState =
  | { phase: "prepared"; prepared: PreparedEventWeaveHandoff }
  | { phase: "sending"; prepared: PreparedEventWeaveHandoff }
  | { phase: "completed"; prepared: PreparedEventWeaveHandoff }
  | { phase: "cancelled"; prepared: PreparedEventWeaveHandoff }
  | { phase: "failed"; prepared: PreparedEventWeaveHandoff; message: string };

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const errorMessages = (trace: ReturnType<typeof parseTraceText>): readonly string[] =>
  trace.ok ? [] : trace.errors.map((error) => error.message);

const disclosureFor = (
  trace: EventWeaveTrace,
  review: CaptureReview,
  content: string,
): HandoffDisclosure => {
  const treatments = review.events.flatMap((event) => event.attributes);
  return {
    traceId: review.traceId,
    sessionId: review.sessionId,
    eventCount: trace.events.length,
    byteCount: new TextEncoder().encode(content).byteLength,
    actors: [...new Set(trace.events.map((event) => event.actor))].sort(),
    eventTypes: [...new Set(trace.events.map((event) => event.type))].sort(),
    removedAttributeCount: treatments.filter((attribute) => attribute.treatment === "removed").length,
    maskedAttributeCount: treatments.filter((attribute) => attribute.treatment === "masked").length,
    events: trace.events.map((event) => ({
      id: event.id,
      actor: event.actor,
      type: event.type,
      message: event.message,
      outcome: event.outcome,
      ...(event.parentId === undefined ? {} : { parentId: event.parentId }),
      attributes: { ...(event.attributes ?? {}) },
    })),
  };
};

export function prepareEventWeaveHandoff(
  capture: CaptureCore,
  review: CaptureReview,
  createHandoffId: () => string = () => globalThis.crypto.randomUUID(),
): PreparedEventWeaveHandoff {
  const snapshot = capture.snapshot();
  if (review.traceId !== snapshot.traceId || review.sessionId !== snapshot.sessionId) {
    throw new Error("The reviewed capture does not match the stopped trace.");
  }
  if (
    review.events.length !== snapshot.events.length ||
    review.events.some((event, index) => event.id !== snapshot.events[index]?.id)
  ) {
    throw new Error("The reviewed event sequence does not match the stopped trace.");
  }
  const trace = capture.toEventWeaveTrace();
  const content = capture.toJson();
  const validation = parseTraceText(content, { format: "json" });
  if (!validation.ok) {
    throw new Error(`EventWeave rejected the prepared trace: ${errorMessages(validation).join(" ")}`);
  }
  if (validation.trace.events.length !== trace.events.length) {
    throw new Error("EventWeave validation changed the prepared event count.");
  }

  const handoffId = createHandoffId();
  if (handoffId.trim() === "" || handoffId !== handoffId.trim()) {
    throw new Error("handoffId must be a non-empty, unpadded string.");
  }

  return {
    message: {
      type: EVENTWEAVE_HANDOFF_MESSAGE_TYPE,
      protocolVersion: EVENTWEAVE_HANDOFF_PROTOCOL_VERSION,
      handoffId,
      format: "json",
      content,
    },
    disclosure: disclosureFor(trace, review, content),
  };
}

export function validateEventWeaveHandoffMessage(value: unknown): HandoffValidationResult {
  if (!isRecord(value)) return { ok: false, errors: ["The handoff message must be an object."] };
  if (value.type !== EVENTWEAVE_HANDOFF_MESSAGE_TYPE) {
    return { ok: false, errors: ["The handoff message type is unsupported."] };
  }
  if (value.protocolVersion !== EVENTWEAVE_HANDOFF_PROTOCOL_VERSION) {
    return { ok: false, errors: ["The handoff protocol version is unsupported."] };
  }
  if (
    typeof value.handoffId !== "string" ||
    value.handoffId.trim() === "" ||
    value.handoffId !== value.handoffId.trim()
  ) {
    return { ok: false, errors: ["The handoff ID is missing."] };
  }
  if (value.format !== "json" || typeof value.content !== "string") {
    return { ok: false, errors: ["The handoff must contain a JSON trace."] };
  }

  const parsed = parseTraceText(value.content, { format: "json" });
  if (!parsed.ok) return { ok: false, errors: errorMessages(parsed) };
  return {
    ok: true,
    message: value as EventWeaveHandoffMessage,
    trace: parsed.trace,
  };
}

export class EventWeaveHandoffSession {
  private stateValue: HandoffSessionState;
  private abortController?: AbortController;

  constructor(prepared: PreparedEventWeaveHandoff) {
    this.stateValue = { phase: "prepared", prepared };
  }

  get state(): HandoffSessionState {
    return this.stateValue;
  }

  async confirm(transport: EventWeaveHandoffTransport): Promise<HandoffSessionState> {
    if (this.stateValue.phase !== "prepared" && this.stateValue.phase !== "failed") {
      throw new Error("Only a prepared or failed handoff can be confirmed.");
    }

    const prepared = this.stateValue.prepared;
    this.abortController = new AbortController();
    this.stateValue = { phase: "sending", prepared };
    try {
      await transport.send(prepared.message, this.abortController.signal);
      if (this.abortController.signal.aborted) {
        this.stateValue = { phase: "cancelled", prepared };
      } else {
        this.stateValue = { phase: "completed", prepared };
      }
    } catch (error) {
      if (this.abortController.signal.aborted) {
        this.stateValue = { phase: "cancelled", prepared };
      } else {
        const message = error instanceof Error ? error.message : "EventWeave did not accept the handoff.";
        this.stateValue = { phase: "failed", prepared, message };
      }
    } finally {
      this.abortController = undefined;
    }
    return this.stateValue;
  }

  cancel(): HandoffSessionState {
    if (this.stateValue.phase === "completed") {
      throw new Error("A completed handoff cannot be cancelled.");
    }
    const prepared = this.stateValue.prepared;
    this.abortController?.abort();
    this.stateValue = { phase: "cancelled", prepared };
    return this.stateValue;
  }

  retry(): HandoffSessionState {
    if (this.stateValue.phase !== "failed" && this.stateValue.phase !== "cancelled") {
      throw new Error("Only a failed or cancelled handoff can be prepared again.");
    }
    this.stateValue = { phase: "prepared", prepared: this.stateValue.prepared };
    return this.stateValue;
  }
}
