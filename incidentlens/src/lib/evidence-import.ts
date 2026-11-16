import type {
  IncidentEvidenceBundle,
  SyntheticConfigChange,
  SyntheticDeployment,
  SyntheticLogEntry,
  SyntheticServiceOwnership,
  SyntheticTicket,
  SyntheticTraceSpan,
} from "../adapters/contracts";

export interface ImportLimits {
  maxBytes: number;
  maxSpans: number;
  maxLogs: number;
  maxChanges: number;
  maxOwnership: number;
}

export interface ImportIssue {
  code: "invalid-json" | "invalid-shape" | "invalid-value" | "limit-exceeded" | "unsafe-input" | "broken-reference";
  path: string;
  message: string;
}

export type ImportResult =
  | { ok: true; bundle: IncidentEvidenceBundle }
  | { ok: false; issues: readonly ImportIssue[] };

export const defaultImportLimits: ImportLimits = {
  maxBytes: 256 * 1024,
  maxSpans: 5_000,
  maxLogs: 5_000,
  maxChanges: 500,
  maxOwnership: 500,
};

type RecordValue = Record<string, unknown>;

const envelopeKeys = ["ticket", "spans", "logs", "deployments", "configChanges", "ownership"] as const;
const forbiddenKey = /(password|passwd|secret|token|authorization|cookie|card|cvv)/i;
const isRecord = (value: unknown): value is RecordValue => typeof value === "object" && value !== null && !Array.isArray(value);
const hasOnlyKeys = (value: RecordValue, allowed: readonly string[]) => Object.keys(value).every((key) => allowed.includes(key));
const stringValue = (value: unknown): value is string => typeof value === "string" && value.trim().length > 0 && value.length <= 500;
const isoTimestamp = (value: unknown): value is string =>
  stringValue(value) && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(value) && !Number.isNaN(Date.parse(value));
const oneOf = <T extends string>(value: unknown, options: readonly T[]): value is T => typeof value === "string" && options.includes(value as T);

const issue = (issues: ImportIssue[], code: ImportIssue["code"], path: string, message: string) => issues.push({ code, path, message });

const requireRecord = (value: unknown, path: string, allowed: readonly string[], issues: ImportIssue[]) => {
  if (!isRecord(value)) {
    issue(issues, "invalid-shape", path, "Expected an object.");
    return undefined;
  }
  for (const key of Object.keys(value)) {
    if (forbiddenKey.test(key)) issue(issues, "unsafe-input", `${path}.${key}`, "Sensitive credential or payment fields are not accepted.");
    else if (!allowed.includes(key)) issue(issues, "invalid-shape", `${path}.${key}`, "Unknown fields are rejected by the default-deny schema.");
  }
  return value;
};

const requireString = (record: RecordValue, key: string, path: string, issues: ImportIssue[]) => {
  const value = record[key];
  if (!stringValue(value)) {
    issue(issues, "invalid-value", `${path}.${key}`, "Expected a non-empty string of at most 500 characters.");
    return "";
  }
  return value.trim();
};

const requireTimestamp = (record: RecordValue, key: string, path: string, issues: ImportIssue[]) => {
  const value = record[key];
  if (!isoTimestamp(value)) {
    issue(issues, "invalid-value", `${path}.${key}`, "Expected a UTC ISO-8601 timestamp.");
    return "";
  }
  return value;
};

const requireArray = (value: unknown, path: string, max: number, issues: ImportIssue[]) => {
  if (!Array.isArray(value)) {
    issue(issues, "invalid-shape", path, "Expected an array.");
    return [] as unknown[];
  }
  if (value.length > max) issue(issues, "limit-exceeded", path, `Maximum ${max} records allowed.`);
  return value.slice(0, max);
};

export function parseSyntheticIncidentJson(text: string, limits: ImportLimits = defaultImportLimits): ImportResult {
  const issues: ImportIssue[] = [];
  if (new TextEncoder().encode(text).byteLength > limits.maxBytes) {
    return { ok: false, issues: [{ code: "limit-exceeded", path: "$", message: `Input exceeds ${limits.maxBytes} bytes.` }] };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return { ok: false, issues: [{ code: "invalid-json", path: "$", message: "Input is not valid JSON." }] };
  }

  const root = requireRecord(parsed, "$", envelopeKeys, issues);
  if (!root || !hasOnlyKeys(root, envelopeKeys)) return { ok: false, issues };

  const ticketRecord = requireRecord(root.ticket, "$.ticket", ["id", "title", "reportedAt", "affectedService", "customerImpact", "symptoms"], issues) ?? {};
  const ticket: SyntheticTicket = {
    id: requireString(ticketRecord, "id", "$.ticket", issues),
    title: requireString(ticketRecord, "title", "$.ticket", issues),
    reportedAt: requireTimestamp(ticketRecord, "reportedAt", "$.ticket", issues),
    affectedService: requireString(ticketRecord, "affectedService", "$.ticket", issues),
    customerImpact: requireString(ticketRecord, "customerImpact", "$.ticket", issues),
    symptoms: requireArray(ticketRecord.symptoms, "$.ticket.symptoms", 50, issues).map((value, index) => {
      if (!stringValue(value)) issue(issues, "invalid-value", `$.ticket.symptoms[${index}]`, "Expected a non-empty string.");
      return typeof value === "string" ? value.trim() : "";
    }),
  };
  if (!ticket.id.startsWith("INC-SYN-")) issue(issues, "unsafe-input", "$.ticket.id", "Public imports must use an INC-SYN- synthetic ticket identifier.");

  const spans: SyntheticTraceSpan[] = requireArray(root.spans, "$.spans", limits.maxSpans, issues).map((value, index) => {
    const path = `$.spans[${index}]`;
    const record = requireRecord(value, path, ["traceId", "spanId", "parentSpanId", "service", "operation", "startedAt", "durationMs", "outcome", "statusCode"], issues) ?? {};
    const durationMs = record.durationMs;
    if (typeof durationMs !== "number" || !Number.isFinite(durationMs) || durationMs < 0) issue(issues, "invalid-value", `${path}.durationMs`, "Expected a non-negative duration.");
    if (!oneOf(record.outcome, ["success", "error", "unknown"] as const)) issue(issues, "invalid-value", `${path}.outcome`, "Expected success, error, or unknown.");
    if (record.statusCode !== undefined && (!Number.isInteger(record.statusCode) || (record.statusCode as number) < 100 || (record.statusCode as number) > 599)) issue(issues, "invalid-value", `${path}.statusCode`, "Expected an HTTP status from 100 through 599.");
    const parentSpanId = record.parentSpanId === undefined ? undefined : requireString(record, "parentSpanId", path, issues);
    return { traceId: requireString(record, "traceId", path, issues), spanId: requireString(record, "spanId", path, issues), ...(parentSpanId ? { parentSpanId } : {}), service: requireString(record, "service", path, issues), operation: requireString(record, "operation", path, issues), startedAt: requireTimestamp(record, "startedAt", path, issues), durationMs: typeof durationMs === "number" ? durationMs : 0, outcome: oneOf(record.outcome, ["success", "error", "unknown"] as const) ? record.outcome : "unknown", ...(typeof record.statusCode === "number" ? { statusCode: record.statusCode } : {}) };
  });

  const logs: SyntheticLogEntry[] = requireArray(root.logs, "$.logs", limits.maxLogs, issues).map((value, index) => {
    const path = `$.logs[${index}]`;
    const record = requireRecord(value, path, ["id", "service", "timestamp", "level", "message", "traceId"], issues) ?? {};
    if (!oneOf(record.level, ["debug", "info", "warn", "error", "fatal"] as const)) issue(issues, "invalid-value", `${path}.level`, "Expected a supported log level.");
    const traceId = record.traceId === undefined ? undefined : requireString(record, "traceId", path, issues);
    return { id: requireString(record, "id", path, issues), service: requireString(record, "service", path, issues), timestamp: requireTimestamp(record, "timestamp", path, issues), level: oneOf(record.level, ["debug", "info", "warn", "error", "fatal"] as const) ? record.level : "info", message: requireString(record, "message", path, issues), ...(traceId ? { traceId } : {}) };
  });

  const deployments: SyntheticDeployment[] = requireArray(root.deployments, "$.deployments", limits.maxChanges, issues).map((value, index) => {
    const path = `$.deployments[${index}]`;
    const record = requireRecord(value, path, ["id", "service", "deployedAt", "version", "summary", "outcome"], issues) ?? {};
    if (!oneOf(record.outcome, ["succeeded", "failed", "rolled-back"] as const)) issue(issues, "invalid-value", `${path}.outcome`, "Expected a supported deployment outcome.");
    return { id: requireString(record, "id", path, issues), service: requireString(record, "service", path, issues), deployedAt: requireTimestamp(record, "deployedAt", path, issues), version: requireString(record, "version", path, issues), summary: requireString(record, "summary", path, issues), outcome: oneOf(record.outcome, ["succeeded", "failed", "rolled-back"] as const) ? record.outcome : "failed" };
  });

  const configChanges: SyntheticConfigChange[] = requireArray(root.configChanges, "$.configChanges", limits.maxChanges, issues).map((value, index) => {
    const path = `$.configChanges[${index}]`;
    const record = requireRecord(value, path, ["id", "service", "changedAt", "key", "summary", "outcome"], issues) ?? {};
    if (!oneOf(record.outcome, ["applied", "rejected", "rolled-back"] as const)) issue(issues, "invalid-value", `${path}.outcome`, "Expected a supported configuration outcome.");
    return { id: requireString(record, "id", path, issues), service: requireString(record, "service", path, issues), changedAt: requireTimestamp(record, "changedAt", path, issues), key: requireString(record, "key", path, issues), summary: requireString(record, "summary", path, issues), outcome: oneOf(record.outcome, ["applied", "rejected", "rolled-back"] as const) ? record.outcome : "rejected" };
  });

  const ownership: SyntheticServiceOwnership[] = requireArray(root.ownership, "$.ownership", limits.maxOwnership, issues).map((value, index) => {
    const path = `$.ownership[${index}]`;
    const record = requireRecord(value, path, ["service", "team", "tier", "dependencies"], issues) ?? {};
    if (record.tier !== 1 && record.tier !== 2 && record.tier !== 3) issue(issues, "invalid-value", `${path}.tier`, "Expected tier 1, 2, or 3.");
    const dependencies = requireArray(record.dependencies, `${path}.dependencies`, 100, issues).map((dependency, dependencyIndex) => {
      if (!stringValue(dependency)) issue(issues, "invalid-value", `${path}.dependencies[${dependencyIndex}]`, "Expected a service name.");
      return typeof dependency === "string" ? dependency.trim() : "";
    });
    return { service: requireString(record, "service", path, issues), team: requireString(record, "team", path, issues), tier: record.tier === 2 || record.tier === 3 ? record.tier : 1, dependencies };
  });

  const spanIds = new Set(spans.map(({ spanId }) => spanId));
  const traceIds = new Set(spans.map(({ traceId }) => traceId));
  spans.forEach((span, index) => {
    if (span.parentSpanId && (!spanIds.has(span.parentSpanId) || span.parentSpanId === span.spanId)) issue(issues, "broken-reference", `$.spans[${index}].parentSpanId`, "Parent span must reference a different imported span.");
  });
  logs.forEach((log, index) => {
    if (log.traceId && !traceIds.has(log.traceId)) issue(issues, "broken-reference", `$.logs[${index}].traceId`, "Trace identifier does not match an imported span.");
  });

  return issues.length > 0 ? { ok: false, issues } : { ok: true, bundle: { ticket, spans, logs, deployments, configChanges, ownership } };
}
