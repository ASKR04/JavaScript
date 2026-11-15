import type { EvidenceCitation, EvidenceSource, IncidentEvidenceBundle, SyntheticServiceOwnership } from "../adapters/contracts";

export type IncidentLocation = "local" | "upstream" | "downstream" | "insufficient-evidence";
export type ConfidenceLevel = "high" | "medium" | "low";
export interface MissingEvidence { source: Exclude<EvidenceSource, "ticket">; reason: string; }
export interface AbnormalEvidenceEvent {
  id: string;
  source: Exclude<EvidenceSource, "ticket" | "ownership">;
  service: string;
  observedAt: string;
  summary: string;
  citation: EvidenceCitation;
}
export interface IncidentCorrelation {
  ticketId: string;
  affectedService: string;
  earliestAbnormal?: AbnormalEvidenceEvent;
  location: IncidentLocation;
  confidence: { level: ConfidenceLevel; score: number; rationale: string };
  citations: readonly EvidenceCitation[];
  missingEvidence: readonly MissingEvidence[];
  explanation: string;
}

const SOURCE_ORDER: Record<AbnormalEvidenceEvent["source"], number> = { trace: 0, log: 1, deployment: 2, config: 3 };
const cite = (source: EvidenceCitation["source"], recordId: string, label: string, observedAt?: string): EvidenceCitation => ({ source, recordId, label, observedAt });

const abnormalEvents = (bundle: IncidentEvidenceBundle): AbnormalEvidenceEvent[] => [
  ...bundle.spans.filter(({ outcome }) => outcome === "error").map((span) => ({
    id: `trace:${span.spanId}`, source: "trace" as const, service: span.service, observedAt: span.startedAt,
    summary: `${span.operation} ended with an error${span.statusCode ? ` (${span.statusCode})` : ""}`,
    citation: cite("trace", span.spanId, `${span.service} · ${span.operation}`, span.startedAt),
  })),
  ...bundle.logs.filter(({ level }) => level === "error" || level === "fatal").map((log) => ({
    id: `log:${log.id}`, source: "log" as const, service: log.service, observedAt: log.timestamp, summary: log.message,
    citation: cite("log", log.id, `${log.service} · ${log.level}`, log.timestamp),
  })),
  ...bundle.deployments.filter(({ outcome }) => outcome !== "succeeded").map((item) => ({
    id: `deployment:${item.id}`, source: "deployment" as const, service: item.service, observedAt: item.deployedAt,
    summary: `${item.version} ${item.outcome}: ${item.summary}`,
    citation: cite("deployment", item.id, `${item.service} · ${item.version}`, item.deployedAt),
  })),
  ...bundle.configChanges.filter(({ outcome }) => outcome !== "applied").map((item) => ({
    id: `config:${item.id}`, source: "config" as const, service: item.service, observedAt: item.changedAt,
    summary: `${item.key} was ${item.outcome}: ${item.summary}`,
    citation: cite("config", item.id, `${item.service} · ${item.key}`, item.changedAt),
  })),
].sort((left, right) => Date.parse(left.observedAt) - Date.parse(right.observedAt)
  || SOURCE_ORDER[left.source] - SOURCE_ORDER[right.source] || left.id.localeCompare(right.id));

const classify = (affected: string, evidence: string, ownership: readonly SyntheticServiceOwnership[]): IncidentLocation => {
  if (evidence === affected) return "local";
  if (ownership.find(({ service }) => service === affected)?.dependencies.includes(evidence)) return "upstream";
  if (ownership.find(({ service }) => service === evidence)?.dependencies.includes(affected)) return "downstream";
  return "insufficient-evidence";
};

const missingEvidence = (bundle: IncidentEvidenceBundle): MissingEvidence[] => {
  const missing: MissingEvidence[] = [];
  if (!bundle.spans.length) missing.push({ source: "trace", reason: "No trace spans were supplied." });
  if (!bundle.logs.length) missing.push({ source: "log", reason: "No log entries were supplied." });
  if (!bundle.deployments.length) missing.push({ source: "deployment", reason: "No deployment history was supplied." });
  if (!bundle.configChanges.length) missing.push({ source: "config", reason: "No configuration history was supplied." });
  if (!bundle.ownership.length) missing.push({ source: "ownership", reason: "No service topology was supplied." });
  return missing;
};

export const correlateIncident = (bundle: IncidentEvidenceBundle): IncidentCorrelation => {
  const events = abnormalEvents(bundle);
  const earliestAbnormal = events[0];
  const missing = missingEvidence(bundle);
  if (!earliestAbnormal) return {
    ticketId: bundle.ticket.id, affectedService: bundle.ticket.affectedService, location: "insufficient-evidence",
    confidence: { level: "low", score: 0, rationale: "No supplied source contains an explicit abnormal signal." },
    citations: [cite("ticket", bundle.ticket.id, bundle.ticket.title, bundle.ticket.reportedAt)], missingEvidence: missing,
    explanation: "No evidence-backed abnormal event was found, so IncidentLens does not identify a failure location.",
  };

  const location = classify(bundle.ticket.affectedService, earliestAbnormal.service, bundle.ownership);
  const earliestTime = Date.parse(earliestAbnormal.observedAt);
  const corroborating = events.filter((event) => event.service === earliestAbnormal.service && Math.abs(Date.parse(event.observedAt) - earliestTime) <= 60_000);
  const distinctSources = new Set(corroborating.map(({ source }) => source));
  const topologyKnown = location !== "insufficient-evidence";
  const level: ConfidenceLevel = topologyKnown && distinctSources.size >= 2 ? "high" : topologyKnown ? "medium" : "low";
  const relation = topologyKnown ? `is ${location} to the affected service` : "cannot be placed in the known service topology";
  return {
    ticketId: bundle.ticket.id, affectedService: bundle.ticket.affectedService, earliestAbnormal, location,
    confidence: {
      level, score: level === "high" ? 0.9 : level === "medium" ? 0.65 : 0.3,
      rationale: topologyKnown
        ? `${distinctSources.size} distinct evidence source${distinctSources.size === 1 ? "" : "s"} support the service and the ownership graph defines its relationship.`
        : "The abnormal event is explicit, but ownership evidence does not define its relationship to the affected service.",
    },
    citations: corroborating.map(({ citation }) => citation), missingEvidence: missing,
    explanation: `The earliest explicit abnormal event is ${earliestAbnormal.summary} in ${earliestAbnormal.service}; that service ${relation}. This is a triage lead, not a root-cause claim.`,
  };
};
