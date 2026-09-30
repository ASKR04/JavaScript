import type { NormalizedTrace, TraceAttribute, TraceEvent, TraceSession } from "./trace-model";

export type ComparisonConfidence = "high" | "medium" | "low";

export type DivergenceKind =
  | "missing-baseline"
  | "missing-candidate"
  | "type"
  | "actor"
  | "label"
  | "outcome"
  | "duration"
  | "timing"
  | "attributes";

export interface EventAlignment {
  baseline?: TraceEvent;
  candidate?: TraceEvent;
  matchBasis: "stable-id" | "semantic" | "unmatched";
  confidence: number;
  changes: DivergenceKind[];
}

export interface TraceComparison {
  baselineSession: TraceSession;
  candidateSession: TraceSession;
  alignments: EventAlignment[];
  confidence: ComparisonConfidence;
  confidenceScore: number;
  firstDivergence?: EventAlignment;
}

const ALIGNMENT_LOOKAHEAD = 32;

const normalizeLabel = (value: string): string =>
  value.trim().toLocaleLowerCase("en-US").replace(/\s+/g, " ");

const eventSimilarity = (baseline: TraceEvent, candidate: TraceEvent): number | undefined => {
  if (baseline.id === candidate.id) return 1;

  const sameType = baseline.type === candidate.type;
  const sameActor = baseline.actor === candidate.actor;
  const sameLabel = normalizeLabel(baseline.message) === normalizeLabel(candidate.message);
  if (!(sameType && sameActor) && !(sameType && sameLabel)) return undefined;

  return (sameType ? 0.45 : 0) + (sameActor ? 0.25 : 0) + (sameLabel ? 0.25 : 0);
};

const orderedAttributes = (attributes: Record<string, TraceAttribute>): string =>
  JSON.stringify(Object.entries(attributes).sort(([left], [right]) => left.localeCompare(right)));

const hasMeaningfulDurationChange = (
  baselineDuration?: number,
  candidateDuration?: number,
): boolean => {
  if (baselineDuration === undefined || candidateDuration === undefined) {
    return baselineDuration !== candidateDuration;
  }

  const difference = Math.abs(candidateDuration - baselineDuration);
  return difference >= 50 && difference >= Math.max(1, baselineDuration) * 0.5;
};

const hasMeaningfulTimingChange = (
  baseline: TraceEvent,
  candidate: TraceEvent,
  baselineStartMs: number,
  candidateStartMs: number,
): boolean => {
  const baselineOffset = baseline.timestampMs - baselineStartMs;
  const candidateOffset = candidate.timestampMs - candidateStartMs;
  const difference = Math.abs(candidateOffset - baselineOffset);
  return difference >= 100 && difference >= Math.max(1, baselineOffset) * 0.5;
};

const describeChanges = (
  baseline: TraceEvent,
  candidate: TraceEvent,
  baselineStartMs: number,
  candidateStartMs: number,
): DivergenceKind[] => {
  const changes: DivergenceKind[] = [];
  if (baseline.type !== candidate.type) changes.push("type");
  if (baseline.actor !== candidate.actor) changes.push("actor");
  if (normalizeLabel(baseline.message) !== normalizeLabel(candidate.message)) changes.push("label");
  if (baseline.outcome !== candidate.outcome) changes.push("outcome");
  if (hasMeaningfulDurationChange(baseline.durationMs, candidate.durationMs)) changes.push("duration");
  if (hasMeaningfulTimingChange(baseline, candidate, baselineStartMs, candidateStartMs)) {
    changes.push("timing");
  }
  if (orderedAttributes(baseline.attributes) !== orderedAttributes(candidate.attributes)) {
    changes.push("attributes");
  }
  return changes;
};

const sessionEvents = (trace: NormalizedTrace, session: TraceSession): TraceEvent[] => {
  const eventsById = new Map(trace.events.map((event) => [event.id, event]));
  return session.eventIds.flatMap((eventId) => {
    const event = eventsById.get(eventId);
    return event ? [event] : [];
  });
};

interface LookaheadMatch {
  index: number;
  similarity: number;
}

const findLookaheadMatch = (
  event: TraceEvent,
  events: TraceEvent[],
  startIndex: number,
): LookaheadMatch | undefined => {
  const endIndex = Math.min(events.length, startIndex + ALIGNMENT_LOOKAHEAD);
  let best: LookaheadMatch | undefined;
  for (let index = startIndex; index < endIndex; index += 1) {
    const similarity = eventSimilarity(event, events[index]);
    if (similarity === undefined) continue;
    if (!best || similarity > best.similarity) best = { index, similarity };
    if (similarity === 1) break;
  }
  return best;
};

const alignEvents = (baselineEvents: TraceEvent[], candidateEvents: TraceEvent[]): EventAlignment[] => {
  const alignments: EventAlignment[] = [];
  let baselineIndex = 0;
  let candidateIndex = 0;
  while (baselineIndex < baselineEvents.length || candidateIndex < candidateEvents.length) {
    const baseline = baselineEvents[baselineIndex];
    const candidate = candidateEvents[candidateIndex];
    const similarity = baseline && candidate ? eventSimilarity(baseline, candidate) : undefined;

    if (baseline && candidate && similarity !== undefined) {
      alignments.push({
        baseline,
        candidate,
        matchBasis: baseline.id === candidate.id ? "stable-id" : "semantic",
        confidence: similarity,
        changes: [],
      });
      baselineIndex += 1;
      candidateIndex += 1;
      continue;
    }

    if (baseline && candidate) {
      const candidateMatch = findLookaheadMatch(baseline, candidateEvents, candidateIndex + 1);
      const baselineMatch = findLookaheadMatch(candidate, baselineEvents, baselineIndex + 1);
      if (
        candidateMatch &&
        (!baselineMatch ||
          candidateMatch.similarity > baselineMatch.similarity ||
          (candidateMatch.similarity === baselineMatch.similarity &&
            candidateMatch.index - candidateIndex <= baselineMatch.index - baselineIndex))
      ) {
        alignments.push({
          candidate,
          matchBasis: "unmatched",
          confidence: 0,
          changes: ["missing-baseline"],
        });
        candidateIndex += 1;
        continue;
      }
    }

    if (baseline) {
      alignments.push({
        baseline,
        matchBasis: "unmatched",
        confidence: 0,
        changes: ["missing-candidate"],
      });
      baselineIndex += 1;
      continue;
    }

    if (candidate) {
      alignments.push({
        candidate,
        matchBasis: "unmatched",
        confidence: 0,
        changes: ["missing-baseline"],
      });
      candidateIndex += 1;
    }
  }

  return alignments;
};

const confidenceLabel = (score: number): ComparisonConfidence =>
  score >= 0.85 ? "high" : score >= 0.6 ? "medium" : "low";

/**
 * Aligns two normalized sessions without using wall-clock timestamps. Stable IDs
 * win when available; otherwise type, actor, label, and relative order provide a
 * transparent semantic fallback. The first changed or missing event is returned
 * as the earliest meaningful divergence.
 */
export const compareTraceSessions = (
  baselineTrace: NormalizedTrace,
  baselineSessionId: string,
  candidateTrace: NormalizedTrace,
  candidateSessionId: string,
): TraceComparison | undefined => {
  const baselineSession = baselineTrace.sessions.find(({ id }) => id === baselineSessionId);
  const candidateSession = candidateTrace.sessions.find(({ id }) => id === candidateSessionId);
  if (!baselineSession || !candidateSession) return undefined;

  const baselineEvents = sessionEvents(baselineTrace, baselineSession);
  const candidateEvents = sessionEvents(candidateTrace, candidateSession);
  const baselineStartMs = baselineEvents[0]?.timestampMs ?? 0;
  const candidateStartMs = candidateEvents[0]?.timestampMs ?? 0;
  const alignments = alignEvents(baselineEvents, candidateEvents).map((alignment) => {
    if (!alignment.baseline || !alignment.candidate) return alignment;
    return {
      ...alignment,
      changes: describeChanges(
        alignment.baseline,
        alignment.candidate,
        baselineStartMs,
        candidateStartMs,
      ),
    };
  });
  const confidenceScore = alignments.length === 0
    ? 0
    : alignments.reduce((total, alignment) => total + alignment.confidence, 0) / alignments.length;

  return {
    baselineSession,
    candidateSession,
    alignments,
    confidence: confidenceLabel(confidenceScore),
    confidenceScore,
    firstDivergence: alignments.find(({ changes }) => changes.length > 0),
  };
};
