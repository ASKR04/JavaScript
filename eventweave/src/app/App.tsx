import { useEffect, useReducer, useRef, useState } from "react";

import { DEFAULT_IMPORT_LIMITS, detectTraceFormat } from "../lib/trace-parser";
import { createTraceImportWorker } from "../workers/create-trace-import-worker";
import type { TraceImportRequest, TraceImportResponse } from "../workers/trace-import-contract";
import { initialTraceImportState, reduceTraceImportState } from "./trace-import-state";

const createRequestId = (): string =>
  globalThis.crypto?.randomUUID?.() ?? `trace-${Date.now()}-${Math.random().toString(16).slice(2)}`;

const formatDuration = (durationMs: number): string =>
  durationMs >= 1_000 ? `${(durationMs / 1_000).toFixed(1)} s` : `${durationMs} ms`;

export const App = () => {
  const [state, dispatch] = useReducer(reduceTraceImportState, initialTraceImportState);
  const [isDragging, setIsDragging] = useState(false);
  const workerRef = useRef<Worker | undefined>(undefined);
  const activeRequestIdRef = useRef<string | undefined>(undefined);

  useEffect(() => {
    const worker = createTraceImportWorker();
    workerRef.current = worker;
    worker.addEventListener("message", (event: MessageEvent<TraceImportResponse>) => {
      if (event.data.type !== "trace-parsed") return;
      dispatch({ type: "parse-finished", requestId: event.data.requestId, result: event.data.result });
    });
    worker.addEventListener("error", () => {
      const requestId = activeRequestIdRef.current;
      if (!requestId) return;
      dispatch({
        type: "read-failed",
        requestId,
        message: "The local parser stopped unexpectedly. Choose the file again to retry.",
      });
    });
    return () => worker.terminate();
  }, []);

  const importFile = (file?: File) => {
    if (!file) return;
    const requestId = createRequestId();
    activeRequestIdRef.current = requestId;
    const format = detectTraceFormat(file.name);
    dispatch({ type: "read-started", requestId, fileName: file.name, format });

    if (file.size > DEFAULT_IMPORT_LIMITS.maxBytes) {
      dispatch({
        type: "read-failed",
        requestId,
        message: `This file is larger than the ${DEFAULT_IMPORT_LIMITS.maxBytes / 1024 / 1024} MiB import limit.`,
      });
      return;
    }

    const reader = new FileReader();
    reader.addEventListener("load", () => {
      if (activeRequestIdRef.current !== requestId) return;
      if (typeof reader.result !== "string") {
        dispatch({ type: "read-failed", requestId, message: "The selected file could not be read as text." });
        return;
      }
      dispatch({ type: "parse-started", requestId });
      const request: TraceImportRequest = {
        type: "parse-trace",
        requestId,
        payload: { text: reader.result, format, importedAt: new Date().toISOString() },
      };
      workerRef.current?.postMessage(request);
    });
    reader.addEventListener("error", () => {
      dispatch({
        type: "read-failed",
        requestId,
        message: "The browser could not read this file. Check its permissions and try again.",
      });
    });
    reader.addEventListener("abort", () => {
      dispatch({ type: "read-failed", requestId, message: "The file read was interrupted. Choose it again to retry." });
    });
    reader.readAsText(file);
  };

  const isBusy = state.phase === "reading" || state.phase === "parsing";
  const statusText = state.phase === "reading"
    ? `Reading ${state.fileName}.`
    : state.phase === "parsing"
      ? `Validating ${state.fileName} off the main thread.`
      : state.phase === "success"
        ? `${state.fileName} is ready to explore.`
        : state.phase === "error"
          ? `${state.fileName ?? "The trace"} could not be imported.`
          : "Choose a local trace to begin.";

  return (
    <div className="app-shell">
      <a className="skip-link" href="#import-workspace">Skip to trace import</a>
      <header className="site-header">
        <a className="brand" href="#main" aria-label="EventWeave home">
          <span className="brand-mark" aria-hidden="true">EW</span>
          <span><strong>EventWeave</strong><small>Local workflow intelligence</small></span>
        </a>
        <span className="privacy-pill"><span aria-hidden="true">●</span> On-device by design</span>
      </header>

      <main id="main">
        <section className="hero" aria-labelledby="hero-title">
          <div>
            <p className="eyebrow">Private trace exploration</p>
            <h1 id="hero-title">Find where a workflow first went off course.</h1>
            <p className="hero-copy">Import a sanitized product trace and turn raw events into causal evidence without sending telemetry beyond your browser.</p>
          </div>
          <aside className="privacy-card" aria-labelledby="privacy-title">
            <span className="privacy-card-icon" aria-hidden="true">01</span>
            <div><p className="eyebrow">Local by default</p><h2 id="privacy-title">Your trace never leaves this tab.</h2></div>
            <p>File reading, schema validation, and normalization happen on your device. EventWeave has no upload endpoint.</p>
          </aside>
        </section>

        <section className="workspace" id="import-workspace" aria-labelledby="workspace-title" tabIndex={-1}>
          <div className="workspace-heading">
            <div><p className="eyebrow">Import workspace</p><h2 id="workspace-title">Bring one workflow into focus.</h2></div>
            <p>JSON and NDJSON · up to 2 MiB · 20,000 events</p>
          </div>

          <div className="import-grid">
            <div>
              <label
                className={`drop-zone${isDragging ? " drop-zone--active" : ""}`}
                onDragEnter={(event) => { event.preventDefault(); setIsDragging(true); }}
                onDragOver={(event) => event.preventDefault()}
                onDragLeave={(event) => { event.preventDefault(); setIsDragging(false); }}
                onDrop={(event) => {
                  event.preventDefault();
                  setIsDragging(false);
                  importFile(event.dataTransfer.files[0]);
                }}
              >
                <input
                  className="visually-hidden"
                  type="file"
                  accept=".json,.ndjson,.jsonl,application/json,application/x-ndjson"
                  onChange={(event) => importFile(event.currentTarget.files?.[0])}
                  onClick={(event) => { event.currentTarget.value = ""; }}
                />
                <span className="drop-zone-mark" aria-hidden="true">＋</span>
                <strong>{isBusy ? "Choose another trace" : "Select or drop a trace"}</strong>
                <span>Only this browser reads the file</span>
              </label>
              <div className="sample-links" aria-label="Sample trace downloads">
                <span>Need a known-good file?</span>
                <a href="/samples/checkout-success.json" download>JSON sample</a>
                <a href="/samples/checkout-failure.ndjson" download>NDJSON sample</a>
              </div>
            </div>

            <div className="import-status" aria-labelledby="status-title">
              <div className="status-heading">
                <div><p className="eyebrow">Current trace</p><h3 id="status-title">{state.fileName ?? "No file selected"}</h3></div>
                <span className={`status-badge status-badge--${state.phase}`}>{state.phase}</span>
              </div>
              <p className="status-message" role="status" aria-live="polite">{statusText}</p>

              {state.phase === "error" && (
                <div className="error-summary" role="alert">
                  <strong>{state.errors.length === 1 ? "1 import issue" : `${state.errors.length} import issues`}</strong>
                  <ol>{state.errors.slice(0, 5).map((error, index) => <li key={`${error.code}-${index}`}>{error.message}</li>)}</ol>
                  {state.errors.length > 5 && <p>Plus {state.errors.length - 5} more issues. Fix the first five, then import again.</p>}
                </div>
              )}

              {state.trace && (
                <div className="trace-summary" aria-label="Imported trace summary">
                  {state.phase === "error" && <p className="retained-note">The last valid trace remains available below.</p>}
                  <dl>
                    <div><dt>Sessions</dt><dd>{state.trace.sessions.length}</dd></div>
                    <div><dt>Events</dt><dd>{state.trace.events.length}</dd></div>
                    <div><dt>Relations</dt><dd>{state.trace.relations.length}</dd></div>
                  </dl>
                  <div className="session-list-wrap">
                    <h4>Session overview</h4>
                    <ul className="session-list">
                      {state.trace.sessions.map((session) => (
                        <li key={session.id}>
                          <span><strong>{session.id}</strong><small>{session.eventIds.length} events · {formatDuration(session.durationMs)}</small></span>
                          <span className={`outcome outcome--${session.outcome}`}>{session.outcome}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>
      </main>
      <footer><p>Built for reproducible debugging, accessible evidence, and data that stays yours.</p></footer>
    </div>
  );
};
