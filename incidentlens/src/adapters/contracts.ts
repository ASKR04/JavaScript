export type EvidenceSource = "ticket" | "trace" | "log" | "deployment" | "config" | "ownership";
export interface EvidenceCitation { source: EvidenceSource; recordId: string; label: string; observedAt?: string; }
export interface SyntheticTicket { id: string; title: string; reportedAt: string; affectedService: string; customerImpact: string; symptoms: readonly string[]; }
export interface SyntheticTraceSpan { traceId: string; spanId: string; parentSpanId?: string; service: string; operation: string; startedAt: string; durationMs: number; outcome: "success" | "error" | "unknown"; statusCode?: number; }
export interface SyntheticLogEntry { id: string; service: string; timestamp: string; level: "debug" | "info" | "warn" | "error" | "fatal"; message: string; traceId?: string; }
export interface SyntheticDeployment { id: string; service: string; deployedAt: string; version: string; summary: string; outcome: "succeeded" | "failed" | "rolled-back"; }
export interface SyntheticConfigChange { id: string; service: string; changedAt: string; key: string; summary: string; outcome: "applied" | "rejected" | "rolled-back"; }
export interface SyntheticServiceOwnership { service: string; team: string; tier: 1 | 2 | 3; dependencies: readonly string[]; }
export interface IncidentEvidenceBundle { ticket: SyntheticTicket; spans: readonly SyntheticTraceSpan[]; logs: readonly SyntheticLogEntry[]; deployments: readonly SyntheticDeployment[]; configChanges: readonly SyntheticConfigChange[]; ownership: readonly SyntheticServiceOwnership[]; }
export interface EvidenceAdapter<T> { readonly source: EvidenceSource; load(): Promise<readonly T[]>; }
