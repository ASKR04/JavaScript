import type { TraceFormat, TraceImportResult } from "../lib/trace-parser";

export interface TraceImportRequest {
  type: "parse-trace";
  requestId: string;
  payload: {
    text: string;
    format: TraceFormat;
    importedAt: string;
  };
}

export interface TraceImportResponse {
  type: "trace-parsed";
  requestId: string;
  result: TraceImportResult;
}

export const isTraceImportRequest = (value: unknown): value is TraceImportRequest => {
  if (typeof value !== "object" || value === null) return false;
  const request = value as Partial<TraceImportRequest>;
  return (
    request.type === "parse-trace" &&
    typeof request.requestId === "string" &&
    request.requestId.trim() !== "" &&
    typeof request.payload === "object" &&
    request.payload !== null &&
    typeof request.payload.text === "string" &&
    (request.payload.format === "json" || request.payload.format === "ndjson") &&
    typeof request.payload.importedAt === "string" &&
    Number.isFinite(Date.parse(request.payload.importedAt))
  );
};
