import { useMemo, useRef, useState } from "react";
import {
  createCaptureDownload,
  downloadCaptureFile,
  type CaptureExportFormat,
} from "../lib/capture-download";
import {
  createDemoCapture,
  recordProfileJourney,
  type DemoCapture,
  type ProfileJourneyOutcome,
} from "../lib/demo-journey";
import {
  profileSaveReview,
  summarizeCapture,
  type CaptureReview,
  type ReviewEvent,
} from "../lib/review-model";

const treatmentLabels = {
  allowed: "Allowed",
  masked: "Masked",
  removed: "Removed",
} as const;

type CapturePhase = "sample" | "recording" | "review";

function EventButton({
  event,
  index,
  selected,
  onSelect,
}: {
  event: ReviewEvent;
  index: number;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      className={`event-button${selected ? " event-button--selected" : ""}`}
      aria-pressed={selected}
      onClick={onSelect}
    >
      <span className="event-index" aria-hidden="true">
        {String(index + 1).padStart(2, "0")}
      </span>
      <span className="event-button-copy">
        <strong>{event.name}</strong>
        <small>
          {event.actor} · {event.type} · +{event.offsetMs} ms
        </small>
      </span>
      <span className={`outcome outcome--${event.outcome}`}>{event.outcome}</span>
    </button>
  );
}

export function App() {
  const demoRef = useRef<DemoCapture | null>(null);
  const [phase, setPhase] = useState<CapturePhase>("sample");
  const [scenario, setScenario] = useState<ProfileJourneyOutcome | null>(null);
  const [review, setReview] = useState<CaptureReview>(profileSaveReview);
  const [selectedId, setSelectedId] = useState(profileSaveReview.events[4]?.id ?? "");
  const [status, setStatus] = useState(
    "Synthetic review sample loaded. Start a new capture when ready.",
  );
  const summary = useMemo(() => summarizeCapture(review), [review]);
  const selectedEvent = review.events.find((event) => event.id === selectedId) ?? review.events[0];
  const recording = phase === "recording";
  const readyToExport = phase === "review" && demoRef.current?.capture.state === "stopped";

  const startCapture = () => {
    const demo = createDemoCapture();
    demo.capture.start();
    demoRef.current = demo;
    setScenario(null);
    setReview(demo.capture.toReview("Profile save — recording"));
    setSelectedId("");
    setPhase("recording");
    setStatus("Recording started. Choose one synthetic profile journey to instrument.");
  };

  const runJourney = (outcome: ProfileJourneyOutcome) => {
    const demo = demoRef.current;
    if (!demo || demo.capture.state !== "recording" || scenario) return;
    const events = recordProfileJourney(demo, outcome);
    const nextReview = demo.capture.toReview(
      outcome === "failure" ? "Profile save — service unavailable" : "Profile save — completed",
    );
    setScenario(outcome);
    setReview(nextReview);
    setSelectedId(
      events.find((event) => event.outcome === "failure")?.id ?? events.at(-1)?.id ?? "",
    );
    setStatus(`${events.length} protected events recorded. Stop recording to seal the review.`);
  };

  const stopCapture = () => {
    const demo = demoRef.current;
    if (!demo || demo.capture.state !== "recording" || !scenario) return;
    demo.capture.stop();
    setPhase("review");
    setStatus("Recording stopped. Review the protected fields, then download a local file.");
  };

  const exportCapture = (format: CaptureExportFormat) => {
    const demo = demoRef.current;
    if (!demo || !readyToExport) return;
    const download = createCaptureDownload(demo.capture, review.name, review.traceId, format);
    downloadCaptureFile(download);
    setStatus(`${format.toUpperCase()} downloaded locally. Upload it to EventWeave manually.`);
  };

  return (
    <div className="app-shell">
      <a className="skip-link" href="#capture-controls">
        Skip to capture controls
      </a>

      <header className="site-header">
        <a className="brand" href="#top" aria-label="TraceRelay home">
          <span className="brand-mark" aria-hidden="true">TR</span>
          <span>
            <strong>TraceRelay</strong>
            <small>Record, review, then export</small>
          </span>
        </a>
        <span
          className={`local-pill local-pill--${recording ? "recording" : "idle"}`}
          aria-live="polite"
        >
          <span aria-hidden="true">●</span> {recording ? "Recording is on" : "Recording is off"}
        </span>
      </header>

      <main id="top">
        <section className="hero" aria-labelledby="page-title">
          <div>
            <p className="eyebrow">Privacy-first capture companion</p>
            <h1 id="page-title">Record only the journey you choose.</h1>
            <p className="hero-copy">
              Start a visible local capture, run one synthetic profile-save journey, stop it,
              inspect every privacy treatment, and download a file for manual EventWeave upload.
            </p>
          </div>
          <div className="hero-note" aria-label="Current implementation boundary">
            <span className="note-number">01</span>
            <div>
              <strong>Explicit and local</strong>
              <p>
                No background recorder, automatic upload, monitoring connection, or arbitrary
                page-content collection.
              </p>
            </div>
          </div>
        </section>

        <section className="control-panel" id="capture-controls" aria-labelledby="controls-title">
          <div>
            <p className="eyebrow">Capture controls</p>
            <h2 id="controls-title">Instrument the synthetic demo</h2>
            <p>
              Starting a capture clears the previous generated journey. Choose one outcome, then
              stop recording before review or download.
            </p>
          </div>
          <div className="control-actions">
            <button type="button" className="primary-action" onClick={startCapture} disabled={recording}>
              Start new capture
            </button>
            <button type="button" onClick={() => runJourney("success")} disabled={!recording || scenario !== null}>
              Run success journey
            </button>
            <button type="button" onClick={() => runJourney("failure")} disabled={!recording || scenario !== null}>
              Run failure journey
            </button>
            <button type="button" className="stop-action" onClick={stopCapture} disabled={!recording || scenario === null}>
              Stop and review
            </button>
          </div>
          <p className="capture-status" role="status" aria-live="polite">{status}</p>
        </section>

        <section className="review-shell" id="review-workspace" aria-labelledby="review-title">
          <div className="review-heading">
            <div>
              <p className="eyebrow">Capture review</p>
              <h2 id="review-title">{review.name}</h2>
              <p>Inspect ordered events and privacy treatments before creating a local file.</p>
            </div>
            <span className="review-state">
              <span aria-hidden="true">{recording ? "●" : "✓"}</span>{" "}
              {recording ? "Recording" : phase === "review" ? "Ready to export" : "Sample only"}
            </span>
          </div>

          <dl className="summary-grid" aria-label="Capture summary">
            <div><dt>Events</dt><dd>{summary.eventCount}</dd></div>
            <div><dt>Actors</dt><dd>{summary.actorCount}</dd></div>
            <div><dt>Types</dt><dd>{summary.typeCount}</dd></div>
            <div><dt>Protected fields</dt><dd>{summary.protectedFieldCount}</dd></div>
          </dl>

          <div className="review-grid">
            <section className="sequence-card" aria-labelledby="sequence-title">
              <div className="panel-heading">
                <div><p className="eyebrow">Ordered evidence</p><h3 id="sequence-title">Recorded journey</h3></div>
                <span>{review.events.length} events</span>
              </div>
              {review.events.length === 0 ? (
                <p className="empty-journey">No events yet. Run one synthetic journey while recording.</p>
              ) : (
                <ol className="event-list">
                  {review.events.map((event, index) => (
                    <li key={event.id}>
                      <EventButton event={event} index={index} selected={event.id === selectedEvent?.id} onSelect={() => setSelectedId(event.id)} />
                    </li>
                  ))}
                </ol>
              )}
            </section>

            <aside className="details-card" aria-labelledby="details-title" aria-live="polite">
              <p className="eyebrow">Selected evidence</p>
              {selectedEvent ? (
                <>
                  <h3 id="details-title">{selectedEvent.name}</h3>
                  <dl className="event-facts">
                    <div><dt>Actor</dt><dd>{selectedEvent.actor}</dd></div>
                    <div><dt>Type</dt><dd>{selectedEvent.type}</dd></div>
                    <div><dt>Offset</dt><dd>+{selectedEvent.offsetMs} ms</dd></div>
                    <div><dt>Outcome</dt><dd>{selectedEvent.outcome}</dd></div>
                  </dl>
                  <div className="attribute-heading">
                    <h4>Reviewed attributes</h4><span>{selectedEvent.attributes.length} fields</span>
                  </div>
                  {selectedEvent.attributes.length === 0 ? (
                    <p className="empty-copy">No attributes were approved for this event.</p>
                  ) : (
                    <ul className="attribute-list">
                      {selectedEvent.attributes.map((attribute) => (
                        <li key={attribute.key}>
                          <div><strong>{attribute.key}</strong><code>{attribute.value}</code></div>
                          <span className={`treatment treatment--${attribute.treatment}`}>{treatmentLabels[attribute.treatment]}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </>
              ) : (
                <><h3 id="details-title">Waiting for evidence</h3><p className="empty-copy">Recorded events will appear here after you run a journey.</p></>
              )}
            </aside>
          </div>

          <section className="privacy-bar" aria-labelledby="privacy-title">
            <div>
              <p className="eyebrow">Privacy checkpoint</p>
              <h3 id="privacy-title">Nothing exports before review.</h3>
              <p>
                Allowed primitives remain, email is masked, and authorization is removed before
                the event enters the review or exported file.
              </p>
            </div>
            <div className="export-actions" aria-describedby="export-help">
              <button type="button" disabled={!readyToExport} onClick={() => exportCapture("json")}>Download reviewed JSON</button>
              <button type="button" disabled={!readyToExport} onClick={() => exportCapture("ndjson")}>Download reviewed NDJSON</button>
              <p id="export-help">
                {readyToExport
                  ? "Files stay local and require manual EventWeave upload."
                  : "Stop a recorded journey to enable downloads."}
              </p>
            </div>
          </section>
        </section>
      </main>

      <footer>
        <span>TraceRelay</span>
        <span>Explicit capture · local review · manual EventWeave upload</span>
      </footer>
    </div>
  );
}
