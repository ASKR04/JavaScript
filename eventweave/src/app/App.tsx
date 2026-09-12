import { useEffect, useMemo, useReducer, useRef, useState } from "react";

import { selectCausalChain } from "../lib/trace-analysis";
import { describeAlignment, describeFirstDivergence } from "../lib/comparison-presentation";
import { compareTraceSessions } from "../lib/trace-comparison";
import { DEFAULT_IMPORT_LIMITS, detectTraceFormat } from "../lib/trace-parser";
import { buildSessionTimeline, findTimelineSelection, type TimelineNavigationKey } from "../lib/timeline-view";
import { createTraceImportWorker } from "../workers/create-trace-import-worker";
import type { TraceImportRequest, TraceImportResponse } from "../workers/trace-import-contract";
import { initialTraceImportState, reduceTraceImportState, type TraceImportAction } from "./trace-import-state";

const createRequestId = (): string =>
  globalThis.crypto?.randomUUID?.() ?? `trace-${Date.now()}-${Math.random().toString(16).slice(2)}`;

const formatDuration = (durationMs: number): string =>
  durationMs >= 1_000 ? `${(durationMs / 1_000).toFixed(1)} s` : `${durationMs} ms`;

const timelineNavigationKeys = new Set<TimelineNavigationKey>([
  "ArrowDown",
  "ArrowLeft",
  "ArrowRight",
  "ArrowUp",
  "End",
  "Home",
]);

export const App = () => {
  const [state, dispatch] = useReducer(reduceTraceImportState, initialTraceImportState);
  const [baselineState, baselineDispatch] = useReducer(reduceTraceImportState, initialTraceImportState);
  const [isDragging, setIsDragging] = useState(false);
  const [selectedSessionId, setSelectedSessionId] = useState<string | undefined>();
  const [selectedEventId, setSelectedEventId] = useState<string | undefined>();
  const [baselineSessionId, setBaselineSessionId] = useState<string | undefined>();
  const workerRef = useRef<Worker | undefined>(undefined);
  const activeRequestIdRef = useRef<string | undefined>(undefined);
  const baselineRequestIdRef = useRef<string | undefined>(undefined);

  useEffect(() => {
    const worker = createTraceImportWorker();
    workerRef.current = worker;
    worker.addEventListener("message", (event: MessageEvent<TraceImportResponse>) => {
      if (event.data.type !== "trace-parsed") return;
      const targetDispatch = event.data.requestId === baselineRequestIdRef.current ? baselineDispatch : dispatch;
      targetDispatch({ type: "parse-finished", requestId: event.data.requestId, result: event.data.result });
    });
    worker.addEventListener("error", () => {
      const requestId = activeRequestIdRef.current;
      const baselineRequestId = baselineRequestIdRef.current;
      if (requestId) dispatch({ type: "read-failed", requestId, message: "The local parser stopped unexpectedly. Choose the file again to retry." });
      if (baselineRequestId) baselineDispatch({ type: "read-failed", requestId: baselineRequestId, message: "The local parser stopped unexpectedly. Choose the baseline again to retry." });
    });
    return () => worker.terminate();
  }, []);

  useEffect(() => {
    const firstSession = state.trace?.sessions[0];
    setSelectedSessionId(firstSession?.id);
    setSelectedEventId(firstSession?.eventIds[0]);
  }, [state.trace]);

  useEffect(() => {
    setBaselineSessionId(baselineState.trace?.sessions[0]?.id);
  }, [baselineState.trace]);

  const timeline = useMemo(
    () => state.trace && selectedSessionId
      ? buildSessionTimeline(state.trace, selectedSessionId)
      : undefined,
    [selectedSessionId, state.trace],
  );
  const selectedEvent = timeline?.events.find(({ event }) => event.id === selectedEventId)?.event;
  const causalChain = useMemo(
    () => state.trace && selectedEventId ? selectCausalChain(state.trace, selectedEventId) : undefined,
    [selectedEventId, state.trace],
  );
  const comparison = useMemo(
    () => baselineState.trace && baselineSessionId && state.trace && selectedSessionId
      ? compareTraceSessions(baselineState.trace, baselineSessionId, state.trace, selectedSessionId)
      : undefined,
    [baselineSessionId, baselineState.trace, selectedSessionId, state.trace],
  );

  const selectSession = (sessionId: string) => {
    setSelectedSessionId(sessionId);
    const session = state.trace?.sessions.find(({ id }) => id === sessionId);
    setSelectedEventId(session?.eventIds[0]);
  };

  const handleTimelineKey = (event: React.KeyboardEvent<HTMLButtonElement>) => {
    if (!timelineNavigationKeys.has(event.key as TimelineNavigationKey) || !timeline) return;
    event.preventDefault();
    const eventIds = timeline.events.map(({ event: timelineEvent }) => timelineEvent.id);
    const nextId = findTimelineSelection(eventIds, selectedEventId ?? "", event.key as TimelineNavigationKey);
    if (!nextId) return;
    setSelectedEventId(nextId);
    const nextIndex = eventIds.indexOf(nextId);
    requestAnimationFrame(() => document.getElementById(`timeline-event-${nextIndex}`)?.focus());
  };

  const importFile = (file?: File, target: "candidate" | "baseline" = "candidate") => {
    if (!file) return;
    const targetDispatch: React.Dispatch<TraceImportAction> = target === "baseline" ? baselineDispatch : dispatch;
    const targetRequestIdRef = target === "baseline" ? baselineRequestIdRef : activeRequestIdRef;
    const requestId = createRequestId();
    targetRequestIdRef.current = requestId;
    const format = detectTraceFormat(file.name);
    targetDispatch({ type: "read-started", requestId, fileName: file.name, format });

    if (file.size > DEFAULT_IMPORT_LIMITS.maxBytes) {
      targetDispatch({
        type: "read-failed",
        requestId,
        message: `This file is larger than the ${DEFAULT_IMPORT_LIMITS.maxBytes / 1024 / 1024} MiB import limit.`,
      });
      return;
    }

    const reader = new FileReader();
    reader.addEventListener("load", () => {
      if (targetRequestIdRef.current !== requestId) return;
      if (typeof reader.result !== "string") {
        targetDispatch({ type: "read-failed", requestId, message: "The selected file could not be read as text." });
        return;
      }
      targetDispatch({ type: "parse-started", requestId });
      const request: TraceImportRequest = {
        type: "parse-trace",
        requestId,
        payload: { text: reader.result, format, importedAt: new Date().toISOString() },
      };
      workerRef.current?.postMessage(request);
    });
    reader.addEventListener("error", () => {
      targetDispatch({
        type: "read-failed",
        requestId,
        message: "The browser could not read this file. Check its permissions and try again.",
      });
    });
    reader.addEventListener("abort", () => {
      targetDispatch({ type: "read-failed", requestId, message: "The file read was interrupted. Choose it again to retry." });
    });
    reader.readAsText(file);
  };

  const importSample = async (path: string, fileName: string, target: "candidate" | "baseline" = "candidate") => {
    const targetDispatch: React.Dispatch<TraceImportAction> = target === "baseline" ? baselineDispatch : dispatch;
    const targetRequestIdRef = target === "baseline" ? baselineRequestIdRef : activeRequestIdRef;
    const requestId = createRequestId();
    targetRequestIdRef.current = requestId;
    const format = detectTraceFormat(fileName);
    targetDispatch({ type: "read-started", requestId, fileName, format });
    try {
      const response = await fetch(path);
      if (!response.ok) throw new Error("Sample request failed");
      const text = await response.text();
      if (targetRequestIdRef.current !== requestId) return;
      targetDispatch({ type: "parse-started", requestId });
      const request: TraceImportRequest = {
        type: "parse-trace",
        requestId,
        payload: { text, format, importedAt: new Date().toISOString() },
      };
      workerRef.current?.postMessage(request);
    } catch {
      targetDispatch({
        type: "read-failed",
        requestId,
        message: "The bundled sample could not be opened. Choose a downloaded trace instead.",
      });
    }
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
                <button type="button" onClick={() => void importSample("/samples/checkout-success.json", "checkout-success.json")}>Open JSON sample</button>
                <button type="button" onClick={() => void importSample("/samples/checkout-failure.ndjson", "checkout-failure.ndjson")}>Open NDJSON sample</button>
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

        {state.trace && timeline && selectedEvent && (
          <section className="explorer" aria-labelledby="explorer-title">
            <div className="explorer-heading">
              <div>
                <p className="eyebrow">Trace explorer</p>
                <h2 id="explorer-title">Follow the workflow, event by event.</h2>
              </div>
              <label className="session-picker">
                <span>Session</span>
                <select value={timeline.session.id} onChange={(event) => selectSession(event.currentTarget.value)}>
                  {state.trace.sessions.map((session) => (
                    <option key={session.id} value={session.id}>
                      {session.id} · {session.eventIds.length} events · {session.outcome}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="explorer-grid">
              <div className="timeline-card" aria-labelledby="timeline-title">
                <div className="panel-heading">
                  <div><p className="eyebrow">Visual timeline</p><h3 id="timeline-title">{timeline.session.id}</h3></div>
                  <span>{formatDuration(timeline.session.durationMs)} total</span>
                </div>
                <p className="interaction-hint" id="timeline-instructions">
                  Use arrow keys, Home, or End to move between events.
                </p>
                <ol className="timeline" aria-describedby="timeline-instructions">
                  {timeline.events.map((item, index) => {
                    const isSelected = item.event.id === selectedEvent.id;
                    return (
                      <li key={item.event.id}>
                        <button
                          id={`timeline-event-${index}`}
                          type="button"
                          className={`timeline-event${isSelected ? " timeline-event--selected" : ""}`}
                          aria-pressed={isSelected}
                          aria-controls="selected-event-evidence"
                          tabIndex={isSelected ? 0 : -1}
                          onClick={() => setSelectedEventId(item.event.id)}
                          onKeyDown={handleTimelineKey}
                        >
                          <span className="event-order" aria-hidden="true">{String(index + 1).padStart(2, "0")}</span>
                          <span className="event-copy">
                            <strong>{item.event.message}</strong>
                            <small>{item.event.actor} · {item.event.type}</small>
                          </span>
                          <span className={`outcome outcome--${item.event.outcome}`}>{item.event.outcome}</span>
                        </button>
                        <span className="time-track" aria-hidden="true">
                          <span
                            className={`time-mark time-mark--${item.event.outcome}`}
                            style={{ left: `min(${item.positionPercent}%, calc(100% - 10px))`, width: `max(10px, ${item.widthPercent}%)` }}
                          />
                        </span>
                        <small className="event-offset">+{formatDuration(item.offsetMs)}</small>
                      </li>
                    );
                  })}
                </ol>
              </div>

              <aside id="selected-event-evidence" className="evidence-card" aria-labelledby="evidence-title">
                <div className="panel-heading">
                  <div><p className="eyebrow">Selected evidence</p><h3 id="evidence-title">{selectedEvent.message}</h3></div>
                  <span className={`outcome outcome--${selectedEvent.outcome}`}>{selectedEvent.outcome}</span>
                </div>
                <dl className="event-details">
                  <div><dt>Actor</dt><dd>{selectedEvent.actor}</dd></div>
                  <div><dt>Type</dt><dd>{selectedEvent.type}</dd></div>
                  <div><dt>Started</dt><dd>{new Date(selectedEvent.timestamp).toLocaleTimeString()}</dd></div>
                  <div><dt>Duration</dt><dd>{selectedEvent.durationMs === undefined ? "Not recorded" : formatDuration(selectedEvent.durationMs)}</dd></div>
                </dl>
                <div className="causal-summary">
                  <h4>Causal context</h4>
                  <p>
                    {causalChain?.ancestors.length ?? 0} ancestor{causalChain?.ancestors.length === 1 ? "" : "s"}
                    {" · "}
                    {causalChain?.descendants.length ?? 0} downstream event{causalChain?.descendants.length === 1 ? "" : "s"}
                  </p>
                  {causalChain && causalChain.ancestors.length > 0 && (
                    <p><strong>Ancestor path:</strong> {causalChain.ancestors.map(({ message }) => message).join(" → ")}</p>
                  )}
                  {causalChain && causalChain.descendants.length > 0 && (
                    <div className="downstream-events">
                      <strong>Downstream evidence</strong>
                      <ul>{causalChain.descendants.map(({ id, message }) => <li key={id}>{message}</li>)}</ul>
                    </div>
                  )}
                  {!selectedEvent.parentId && causalChain?.descendants.length === 0 && <p>No explicit parent relations connect this event.</p>}
                </div>
              </aside>
            </div>

            <div className="table-card" aria-labelledby="event-table-title">
              <div className="panel-heading">
                <div><p className="eyebrow">Accessible alternative</p><h3 id="event-table-title">Event table</h3></div>
                <span>Selection stays synchronized</span>
              </div>
              <div className="table-scroll" tabIndex={0} aria-label="Scrollable event table">
                <table>
                  <caption>Events in {timeline.session.id}, ordered by occurrence</caption>
                  <thead><tr><th scope="col">Time</th><th scope="col">Event</th><th scope="col">Actor</th><th scope="col">Type</th><th scope="col">Duration</th><th scope="col">Outcome</th></tr></thead>
                  <tbody>
                    {timeline.events.map((item) => (
                      <tr key={item.event.id} className={item.event.id === selectedEvent.id ? "table-row--selected" : undefined}>
                        <td>+{formatDuration(item.offsetMs)}</td>
                        <th scope="row">
                          <button
                            type="button"
                            aria-pressed={item.event.id === selectedEvent.id}
                            aria-controls="selected-event-evidence"
                            onClick={() => setSelectedEventId(item.event.id)}
                          >
                            {item.event.message}
                          </button>
                        </th>
                        <td>{item.event.actor}</td>
                        <td>{item.event.type}</td>
                        <td>{item.event.durationMs === undefined ? "—" : formatDuration(item.event.durationMs)}</td>
                        <td><span className={`outcome outcome--${item.event.outcome}`}>{item.event.outcome}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <section className="comparison-card" aria-labelledby="comparison-title">
              <div className="panel-heading comparison-heading">
                <div>
                  <p className="eyebrow">Success versus failure</p>
                  <h3 id="comparison-title">Find the first meaningful divergence.</h3>
                </div>
                {comparison && <span className={`confidence confidence--${comparison.confidence}`}>{comparison.confidence} confidence · {Math.round(comparison.confidenceScore * 100)}%</span>}
              </div>

              <div className="comparison-controls">
                <div className="baseline-import">
                  <label className="baseline-file">
                    <span>Baseline trace</span>
                    <input
                      type="file"
                      accept=".json,.ndjson,.jsonl,application/json,application/x-ndjson"
                      onChange={(event) => importFile(event.currentTarget.files?.[0], "baseline")}
                      onClick={(event) => { event.currentTarget.value = ""; }}
                    />
                  </label>
                  <button type="button" className="sample-button" onClick={() => void importSample("/samples/checkout-success.json", "checkout-success.json", "baseline")}>Use successful sample</button>
                  <p role="status" aria-live="polite">
                    {baselineState.phase === "error"
                      ? baselineState.errors[0]?.message
                      : baselineState.trace
                        ? `${baselineState.fileName} is ready as the baseline.`
                        : "Choose a successful or expected trace to compare."}
                  </p>
                </div>
                {baselineState.trace && (
                  <label className="session-picker">
                    <span>Baseline session</span>
                    <select value={baselineSessionId} onChange={(event) => setBaselineSessionId(event.currentTarget.value)}>
                      {baselineState.trace.sessions.map((session) => <option key={session.id} value={session.id}>{session.id} · {session.outcome}</option>)}
                    </select>
                  </label>
                )}
              </div>

              {comparison ? (
                <div className="comparison-results">
                  <p className="divergence-summary" role="status">{describeFirstDivergence(comparison)}</p>
                  <div className="table-scroll" tabIndex={0} aria-label="Scrollable comparison table">
                    <table>
                      <caption>Aligned events comparing {comparison.baselineSession.id} with {comparison.candidateSession.id}</caption>
                      <thead><tr><th scope="col">Step</th><th scope="col">Baseline</th><th scope="col">Candidate</th><th scope="col">Match</th><th scope="col">Change</th></tr></thead>
                      <tbody>
                        {comparison.alignments.map((alignment, index) => {
                          const isFirst = alignment === comparison.firstDivergence;
                          const focusId = alignment.candidate?.id;
                          return (
                            <tr key={`${alignment.baseline?.id ?? "missing"}-${alignment.candidate?.id ?? "missing"}`} className={isFirst ? "comparison-row--first" : undefined}>
                              <td>{isFirst ? "First divergence" : index + 1}</td>
                              <td>{alignment.baseline?.message ?? "Missing"}</td>
                              <th scope="row">
                                {focusId ? <button type="button" onClick={() => setSelectedEventId(focusId)}>{alignment.candidate?.message}</button> : "Missing"}
                              </th>
                              <td>{alignment.matchBasis} · {Math.round(alignment.confidence * 100)}%</td>
                              <td>{describeAlignment(alignment)}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <p className="comparison-empty">Your current trace is the candidate. Add a baseline to align both sessions and reveal their first meaningful change.</p>
              )}
            </section>
          </section>
        )}
      </main>
      <footer><p>Built for reproducible debugging, accessible evidence, and data that stays yours.</p></footer>
    </div>
  );
};
