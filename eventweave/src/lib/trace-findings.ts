import type { NormalizedTrace, TraceEvent } from "./trace-model";

export const DEFAULT_FINDING_RULES = {
  slowDurationMs: 400,
  repeatedFailureCount: 2,
  completionStates: ["complete", "completed"],
  completionEventTypes: ["workflow.complete", "workflow.completed"],
} as const;

export type FindingKind = "slow-span" | "repeated-failure" | "missing-completion";

export interface FindingRules {
  slowDurationMs?: number;
  repeatedFailureCount?: number;
  completionStates?: readonly string[];
  completionEventTypes?: readonly string[];
}

export interface TraceFinding {
  id: string;
  sessionId: string;
  kind: FindingKind;
  severity: "warning" | "critical";
  title: string;
  explanation: string;
  /** Stable IDs of events that can be selected in the existing explorer. */
  eventIds: string[];
}

const normalizeTokens = (values: readonly string[]): Set<string> =>
  new Set(values.map((value) => value.trim().toLowerCase()).filter(Boolean));

const validateRules = (rules: FindingRules): void => {
  if (rules.slowDurationMs !== undefined && (!Number.isFinite(rules.slowDurationMs) || rules.slowDurationMs < 0)) {
    throw new RangeError("slowDurationMs must be a finite non-negative number");
  }
  if (rules.repeatedFailureCount !== undefined && (!Number.isSafeInteger(rules.repeatedFailureCount) || rules.repeatedFailureCount < 2)) {
    throw new RangeError("repeatedFailureCount must be an integer of at least two");
  }
};

const isCompletion = (event: TraceEvent, states: Set<string>, types: Set<string>): boolean =>
  types.has(event.type.toLowerCase()) ||
  (event.type === "state.transition" &&
    typeof event.attributes.to === "string" &&
    states.has(event.attributes.to.trim().toLowerCase()));

/**
 * Applies explicit, deterministic heuristics to already-validated trace data.
 * A finding is a review prompt, not a causal or performance diagnosis.
 */
export const findTraceFindings = (
  trace: NormalizedTrace,
  rules: FindingRules = {},
): TraceFinding[] => {
  validateRules(rules);
  const slowDurationMs = rules.slowDurationMs ?? DEFAULT_FINDING_RULES.slowDurationMs;
  const repeatedFailureCount = rules.repeatedFailureCount ?? DEFAULT_FINDING_RULES.repeatedFailureCount;
  const completionStates = normalizeTokens(rules.completionStates ?? DEFAULT_FINDING_RULES.completionStates);
  const completionEventTypes = normalizeTokens(rules.completionEventTypes ?? DEFAULT_FINDING_RULES.completionEventTypes);
  const eventsById = new Map(trace.events.map((event) => [event.id, event]));
  const findings: TraceFinding[] = [];

  for (const session of trace.sessions) {
    const events = session.eventIds.flatMap((id) => {
      const event = eventsById.get(id);
      return event && event.sessionId === session.id ? [event] : [];
    });
    if (events.length === 0) continue;

    const sessionFindings: Array<{ index: number; finding: TraceFinding }> = [];
    const failuresBySignature = new Map<string, { events: TraceEvent[]; firstIndex: number }>();
    const stateTransitions: Array<{ event: TraceEvent; index: number }> = [];

    events.forEach((event, index) => {
      if (event.durationMs !== undefined && event.durationMs >= slowDurationMs) {
        sessionFindings.push({
          index,
          finding: {
            id: `slow-span:${event.id}`,
            sessionId: session.id,
            kind: "slow-span",
            severity: "warning",
            title: `Slow span: ${event.durationMs} ms`,
            explanation: `Recorded duration ${event.durationMs} ms meets the configured ${slowDurationMs} ms threshold. This rule does not infer the cause of the delay.`,
            eventIds: [event.id],
          },
        });
      }

      if (event.outcome === "failure") {
        const signature = JSON.stringify([event.actor, event.type]);
        const group = failuresBySignature.get(signature) ?? { events: [], firstIndex: index };
        group.events.push(event);
        failuresBySignature.set(signature, group);
      }
      if (event.type === "state.transition" && typeof event.attributes.to === "string") {
        stateTransitions.push({ event, index });
      }
    });

    for (const { events: failures, firstIndex } of failuresBySignature.values()) {
      if (failures.length < repeatedFailureCount) continue;
      const first = failures[0];
      sessionFindings.push({
        index: firstIndex,
        finding: {
          id: `repeated-failure:${first.id}`,
          sessionId: session.id,
          kind: "repeated-failure",
          severity: "critical",
          title: `${failures.length} failures from ${first.actor}`,
          explanation: `${failures.length} failed events share actor ${first.actor} and type ${first.type}; the configured threshold is ${repeatedFailureCount}. They may be separate attempts, not one causal chain.`,
          eventIds: failures.map(({ id }) => id),
        },
      });
    }

    if (stateTransitions.length > 0 && !events.some((event) => isCompletion(event, completionStates, completionEventTypes))) {
      const { event: lastTransition, index } = stateTransitions[stateTransitions.length - 1];
      sessionFindings.push({
        index,
        finding: {
          id: `missing-completion:${lastTransition.id}`,
          sessionId: session.id,
          kind: "missing-completion",
          severity: "warning",
          title: "No completion signal recorded",
          explanation: `This session contains state transitions but no event with a configured completion type or destination state. The last observed transition targets ${String(lastTransition.attributes.to)}; the trace may be incomplete or use a different completion vocabulary.`,
          eventIds: [lastTransition.id],
        },
      });
    }

    sessionFindings.sort((left, right) => left.index - right.index || left.finding.kind.localeCompare(right.finding.kind));
    findings.push(...sessionFindings.map(({ finding }) => finding));
  }

  return findings;
};
