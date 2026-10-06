import { useMemo, useState } from "react";
import {
  profileSaveReview,
  summarizeCapture,
  type ReviewEvent,
} from "../lib/review-model";

const treatmentLabels = {
  allowed: "Allowed",
  masked: "Masked",
  removed: "Removed",
} as const;

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
  const review = profileSaveReview;
  const summary = useMemo(() => summarizeCapture(review), [review]);
  const [selectedId, setSelectedId] = useState(review.events[4]?.id ?? review.events[0]?.id);
  const selectedEvent = review.events.find((event) => event.id === selectedId) ?? review.events[0];

  if (!selectedEvent) return null;

  return (
    <div className="app-shell">
      <a className="skip-link" href="#review-workspace">
        Skip to capture review
      </a>

      <header className="site-header">
        <a className="brand" href="#top" aria-label="TraceRelay home">
          <span className="brand-mark" aria-hidden="true">TR</span>
          <span>
            <strong>TraceRelay</strong>
            <small>Review before you export</small>
          </span>
        </a>
        <span className="local-pill"><span aria-hidden="true">●</span> Local synthetic demo</span>
      </header>

      <main id="top">
        <section className="hero" aria-labelledby="page-title">
          <div>
            <p className="eyebrow">Privacy-first capture companion</p>
            <h1 id="page-title">See exactly what leaves the browser.</h1>
            <p className="hero-copy">
              TraceRelay will record one explicitly started journey, protect sensitive fields,
              and prepare a reviewable EventWeave trace. This first interface demonstrates the
              review boundary with synthetic data only.
            </p>
          </div>
          <div className="hero-note" aria-label="Current implementation boundary">
            <span className="note-number">01</span>
            <div>
              <strong>Review surface first</strong>
              <p>The capture SDK and verified export contract arrive in Atlas&apos;s core-systems shift.</p>
            </div>
          </div>
        </section>

        <section className="review-shell" id="review-workspace" aria-labelledby="review-title">
          <div className="review-heading">
            <div>
              <p className="eyebrow">Capture review</p>
              <h2 id="review-title">{review.name}</h2>
              <p>Inspect the ordered events and privacy treatments before any file is created.</p>
            </div>
            <span className="review-state"><span aria-hidden="true">✓</span> Ready to review</span>
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
                <div>
                  <p className="eyebrow">Ordered evidence</p>
                  <h3 id="sequence-title">Recorded journey</h3>
                </div>
                <span>{review.events.length} events</span>
              </div>
              <ol className="event-list">
                {review.events.map((event, index) => (
                  <li key={event.id}>
                    <EventButton
                      event={event}
                      index={index}
                      selected={event.id === selectedEvent.id}
                      onSelect={() => setSelectedId(event.id)}
                    />
                  </li>
                ))}
              </ol>
            </section>

            <aside className="details-card" aria-labelledby="details-title" aria-live="polite">
              <p className="eyebrow">Selected evidence</p>
              <h3 id="details-title">{selectedEvent.name}</h3>
              <dl className="event-facts">
                <div><dt>Actor</dt><dd>{selectedEvent.actor}</dd></div>
                <div><dt>Type</dt><dd>{selectedEvent.type}</dd></div>
                <div><dt>Offset</dt><dd>+{selectedEvent.offsetMs} ms</dd></div>
                <div><dt>Outcome</dt><dd>{selectedEvent.outcome}</dd></div>
              </dl>

              <div className="attribute-heading">
                <h4>Reviewed attributes</h4>
                <span>{selectedEvent.attributes.length} fields</span>
              </div>
              {selectedEvent.attributes.length === 0 ? (
                <p className="empty-copy">No attributes were approved for this event.</p>
              ) : (
                <ul className="attribute-list">
                  {selectedEvent.attributes.map((attribute) => (
                    <li key={attribute.key}>
                      <div>
                        <strong>{attribute.key}</strong>
                        <code>{attribute.value}</code>
                      </div>
                      <span className={`treatment treatment--${attribute.treatment}`}>
                        {treatmentLabels[attribute.treatment]}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </aside>
          </div>

          <section className="privacy-bar" aria-labelledby="privacy-title">
            <div>
              <p className="eyebrow">Privacy checkpoint</p>
              <h3 id="privacy-title">Nothing exports before review.</h3>
              <p>
                Two synthetic fields were protected. Real capture will use a default-deny policy,
                bounded memory, and explicit start and stop controls.
              </p>
            </div>
            <div className="export-actions" aria-describedby="export-help">
              <button type="button" disabled>Download JSON</button>
              <button type="button" disabled>Download NDJSON</button>
              <p id="export-help">Export unlocks after the validated capture contract lands.</p>
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
