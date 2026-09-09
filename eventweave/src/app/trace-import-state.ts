import type { NormalizedTrace } from "../lib/trace-model";
import type { TraceFormat } from "../lib/trace-parser";

export interface ImportIssue {
  code: string;
  message: string;
}

export type ImportPhase = "idle" | "reading" | "parsing" | "success" | "error";

export interface TraceImportState {
  phase: ImportPhase;
  activeRequestId?: string;
  fileName?: string;
  format?: TraceFormat;
  trace?: NormalizedTrace;
  errors: ImportIssue[];
}

export type TraceImportAction =
  | { type: "read-started"; requestId: string; fileName: string; format: TraceFormat }
  | { type: "read-failed"; requestId: string; message: string }
  | { type: "parse-started"; requestId: string }
  | {
      type: "parse-finished";
      requestId: string;
      result:
        | { ok: true; format: TraceFormat; trace: NormalizedTrace }
        | { ok: false; format: TraceFormat; errors: ImportIssue[] };
    };

export const initialTraceImportState: TraceImportState = { phase: "idle", errors: [] };

const isCurrentRequest = (state: TraceImportState, requestId: string): boolean =>
  state.activeRequestId === requestId;

export const reduceTraceImportState = (
  state: TraceImportState,
  action: TraceImportAction,
): TraceImportState => {
  switch (action.type) {
    case "read-started":
      return {
        ...state,
        phase: "reading",
        activeRequestId: action.requestId,
        fileName: action.fileName,
        format: action.format,
        errors: [],
      };
    case "read-failed":
      if (!isCurrentRequest(state, action.requestId)) return state;
      return {
        ...state,
        phase: "error",
        errors: [{ code: "file-read-failed", message: action.message }],
      };
    case "parse-started":
      if (!isCurrentRequest(state, action.requestId)) return state;
      return { ...state, phase: "parsing", errors: [] };
    case "parse-finished":
      if (!isCurrentRequest(state, action.requestId)) return state;
      if (!action.result.ok) {
        return { ...state, phase: "error", format: action.result.format, errors: action.result.errors };
      }
      return {
        ...state,
        phase: "success",
        format: action.result.format,
        trace: action.result.trace,
        errors: [],
      };
  }
};
