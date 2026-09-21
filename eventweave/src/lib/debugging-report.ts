import { selectCausalChain } from "./trace-analysis";
import { describeAlignment, describeFirstDivergence } from "./comparison-presentation";
import type { TraceComparison } from "./trace-comparison";
import type { NormalizedTrace, TraceEvent } from "./trace-model";

export interface DebuggingReportInput {
  trace: NormalizedTrace;
  sessionId: string;
  selectedEventId: string;
  generatedAt: string;
  comparison?: TraceComparison;
}

export interface DebuggingReport {
  fileName: string;
  markdown: string;
}

const escapeCell = (value: string): string =>
  value.replace(/\s+/g, " ").trim().replace(/\\/g, "\\\\").replace(/[|`*_<>\[\]()!#]/g, "\\$&");

const safeFilePart = (value: string): string =>
  value.toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 56) || "session";

const duration = (event: TraceEvent): string =>
  event.durationMs === undefined ? "Not recorded" : `${event.durationMs} ms`;

/** Builds a local, deterministic evidence report without treating imported text as Markdown markup. */
export const buildDebuggingReport = (input: DebuggingReportInput): DebuggingReport | undefined => {
  const session = input.trace.sessions.find(({ id }) => id === input.sessionId);
  if (!session || !session.eventIds.includes(input.selectedEventId)) return undefined;

  const eventsById = new Map(input.trace.events.map((event) => [event.id, event]));
  const events = session.eventIds.flatMap((id) => {
    const event = eventsById.get(id);
    return event ? [event] : [];
  });
  const selected = eventsById.get(input.selectedEventId);
  const chain = selectCausalChain(input.trace, input.selectedEventId);
  if (!selected || !chain) return undefined;

  const lines = [
    "# EventWeave debugging report",
    "",
    `- Generated locally: ${escapeCell(input.generatedAt)}`,
    `- Session: ${escapeCell(session.id)}`,
    `- Session outcome: ${session.outcome}`,
    `- Events: ${events.length}`,
    `- Duration: ${session.durationMs} ms`,
    "",
    "## Selected evidence",
    "",
    `- Event: ${escapeCell(selected.message)}`,
    `- Event ID: ${escapeCell(selected.id)}`,
    `- Actor / type: ${escapeCell(selected.actor)} / ${escapeCell(selected.type)}`,
    `- Outcome / duration: ${selected.outcome} / ${duration(selected)}`,
    `- Timestamp: ${escapeCell(selected.timestamp)}`,
    "",
    "## Explicit causal context",
    "",
    "Only validated parent links are treated as causal evidence. Timeline sequence alone is not a causal claim.",
    "",
    `- Ancestors: ${chain.ancestors.length ? chain.ancestors.map(({ id }) => escapeCell(id)).join(" → ") : "None"}`,
    `- Downstream events: ${chain.descendants.length ? chain.descendants.map(({ id }) => escapeCell(id)).join(", ") : "None"}`,
    "",
    "## Session event timeline",
    "",
    "| Time (UTC) | Event ID | Actor | Type | Message | Outcome | Duration |",
    "| --- | --- | --- | --- | --- | --- | --- |",
    ...events.map((event) => `| ${escapeCell(event.timestamp)} | ${escapeCell(event.id)} | ${escapeCell(event.actor)} | ${escapeCell(event.type)} | ${escapeCell(event.message)} | ${event.outcome} | ${duration(event)} |`),
  ];

  if (input.comparison?.candidateSession.id === session.id) {
    const comparison = input.comparison;
    lines.push(
      "",
      "## Baseline comparison",
      "",
      `- Baseline session: ${escapeCell(comparison.baselineSession.id)}`,
      `- Alignment confidence: ${comparison.confidence} (${Math.round(comparison.confidenceScore * 100)}%)`,
      `- ${escapeCell(describeFirstDivergence(comparison))}`,
      "",
      "| Baseline event | Candidate event | Match basis | Change |",
      "| --- | --- | --- | --- |",
      ...comparison.alignments.map((alignment) => `| ${escapeCell(alignment.baseline?.message ?? "Missing")} | ${escapeCell(alignment.candidate?.message ?? "Missing")} | ${alignment.matchBasis} | ${escapeCell(describeAlignment(alignment))} |`),
    );
  }

  lines.push("", "---", "Generated on-device by EventWeave. Review imported trace content before sharing this report.", "");
  return {
    fileName: `eventweave-${safeFilePart(session.id)}-report.md`,
    markdown: lines.join("\n"),
  };
};
