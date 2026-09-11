/// <reference lib="webworker" />

import { parseTraceText } from "../lib/trace-parser";
import {
  isTraceImportRequest,
  type TraceImportResponse,
} from "./trace-import-contract";

const workerScope: DedicatedWorkerGlobalScope = self as unknown as DedicatedWorkerGlobalScope;

workerScope.addEventListener("message", (event: MessageEvent<unknown>) => {
  if (!isTraceImportRequest(event.data)) return;

  const { requestId, payload } = event.data;
  const response: TraceImportResponse = {
    type: "trace-parsed",
    requestId,
    result: parseTraceText(payload.text, {
      format: payload.format,
      importedAt: payload.importedAt,
    }),
  };
  workerScope.postMessage(response);
});

export {};
