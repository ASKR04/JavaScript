import type {
  EvidenceCitation,
  EvidenceSource,
  IncidentEvidenceBundle,
  SyntheticServiceOwnership,
} from "../adapters/contracts";
import type { IncidentCorrelation } from "./correlation";

export type TimelineSource = Exclude<EvidenceSource, "ticket" | "ownership">;
export type EvidenceTimelineItem = {
  id: string;
  source: TimelineSource;
  service: string;
  observedAt: string;
  label: string;
  detail: string;
  abnormal: boolean;
};

export type ServicePathNode = {
  service: string;
  team: string;
  role: "evidence lead" | "affected" | "dependency";
};

const serviceOwner = (ownership: readonly SyntheticServiceOwnership[], service: string): string =>
  ownership.find((item) => item.service === service)?.team ?? "Ownership not supplied";

export function buildEvidenceTimeline(bundle: IncidentEvidenceBundle): EvidenceTimelineItem[] {
  return [
    ...bundle.spans.map((item) => ({
      id: `trace:${item.spanId}`, source: "trace" as const, service: item.service,
      observedAt: item.startedAt, label: item.operation,
      detail: `${item.durationMs} ms${item.statusCode ? ` · status ${item.statusCode}` : ""}`,
      abnormal: item.outcome === "error",
    })),
    ...bundle.logs.map((item) => ({
      id: `log:${item.id}`, source: "log" as const, service: item.service,
      observedAt: item.timestamp, label: item.message, detail: item.level,
      abnormal: item.level === "error" || item.level === "fatal",
    })),
    ...bundle.deployments.map((item) => ({
      id: `deployment:${item.id}`, source: "deployment" as const, service: item.service,
      observedAt: item.deployedAt, label: `${item.version} deployment`, detail: item.summary,
      abnormal: item.outcome !== "succeeded",
    })),
    ...bundle.configChanges.map((item) => ({
      id: `config:${item.id}`, source: "config" as const, service: item.service,
      observedAt: item.changedAt, label: item.key, detail: item.summary,
      abnormal: item.outcome !== "applied",
    })),
  ].sort((left, right) => Date.parse(left.observedAt) - Date.parse(right.observedAt) || left.id.localeCompare(right.id));
}

export function buildServicePath(bundle: IncidentEvidenceBundle, result: IncidentCorrelation): ServicePathNode[] {
  const affected = bundle.ticket.affectedService;
  const lead = result.earliestAbnormal?.service;
  const dependencies = bundle.ownership.find(({ service }) => service === affected)?.dependencies ?? [];
  const services = [...new Set([affected, ...dependencies, ...(lead ? [lead] : [])])];
  return services.map((service) => ({
    service,
    team: serviceOwner(bundle.ownership, service),
    role: service === lead ? "evidence lead" : service === affected ? "affected" : "dependency",
  }));
}

export function citationForItem(item: EvidenceTimelineItem): EvidenceCitation {
  return { source: item.source, recordId: item.id.split(":").slice(1).join(":"), label: `${item.service} · ${item.label}`, observedAt: item.observedAt };
}

export function buildReviewedReport(
  bundle: IncidentEvidenceBundle,
  result: IncidentCorrelation,
  reviewerNote: string,
): { fileName: string; markdown: string } {
  const missing = result.missingEvidence.length
    ? result.missingEvidence.map((item) => `- ${item.source}: ${item.reason}`).join("\n")
    : "- None identified in the supplied synthetic bundle.";
  const citations = result.citations.map((item) => `- [${item.source}:${item.recordId}] ${item.label}${item.observedAt ? ` — ${item.observedAt}` : ""}`).join("\n");
  return {
    fileName: `${bundle.ticket.id.toLowerCase()}-review.md`,
    markdown: `# IncidentLens reviewed triage\n\n## Incident\n\n- ID: ${bundle.ticket.id}\n- Affected service: ${bundle.ticket.affectedService}\n- Evidence relationship: ${result.location}\n- Confidence: ${result.confidence.level} (${Math.round(result.confidence.score * 100)}% evidence coverage)\n\n## Evidence-backed lead\n\n${result.explanation}\n\nThis is a human-reviewed triage lead, not a root-cause verdict or ownership assignment.\n\n## Reviewer note\n\n${reviewerNote.trim() || "No additional reviewer note."}\n\n## Missing evidence\n\n${missing}\n\n## Citations\n\n${citations}\n`,
  };
}
