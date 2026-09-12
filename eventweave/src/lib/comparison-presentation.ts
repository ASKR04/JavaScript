import type { EventAlignment, TraceComparison } from "./trace-comparison";

export const describeAlignment = (alignment: EventAlignment): string => {
  if (!alignment.baseline) return "Only in candidate";
  if (!alignment.candidate) return "Only in baseline";
  if (alignment.changes.length === 0) return "No meaningful change";
  return alignment.changes.join(", ");
};

export const describeFirstDivergence = (comparison: TraceComparison): string => {
  const first = comparison.firstDivergence;
  if (!first) return "No meaningful divergence found in these sessions.";
  const event = first.candidate ?? first.baseline;
  return `First divergence: ${event?.message ?? "unidentified event"} (${describeAlignment(first)}).`;
};
