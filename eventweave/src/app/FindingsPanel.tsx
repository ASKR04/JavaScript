import { useMemo } from "react";

import { findTraceFindings, type TraceFinding } from "../lib/trace-findings";
import type { NormalizedTrace } from "../lib/trace-model";
import styles from "./FindingsPanel.module.css";

export interface FindingsPanelProps {
  trace: NormalizedTrace;
  sessionId: string;
  onSelectEvent: (eventId: string) => void;
}

const evidenceLabel = (finding: TraceFinding, index: number, message: string): string =>
  finding.eventIds.length === 1
    ? `Inspect event: ${message}`
    : `Inspect evidence ${index + 1} of ${finding.eventIds.length}: ${message}`;

/** A review aid for the selected session; findings are heuristics, not diagnoses. */
export const FindingsPanel = ({ trace, sessionId, onSelectEvent }: FindingsPanelProps) => {
  const findings = useMemo(
    () => findTraceFindings(trace).filter((finding) => finding.sessionId === sessionId),
    [trace, sessionId],
  );
  const eventById = useMemo(() => new Map(trace.events.map((event) => [event.id, event])), [trace]);

  return (
    <section className={styles.panel} aria-labelledby="findings-title">
      <div className={styles.heading}>
        <div>
          <p className={styles.eyebrow}>Review prompts</p>
          <h3 id="findings-title">Trace findings</h3>
        </div>
        <span className={styles.count} aria-label={`${findings.length} findings`}>{findings.length}</span>
      </div>
      <p className={styles.disclaimer}>
        Rules flag recorded patterns for investigation. They do not establish a root cause or prove that an event caused another.
      </p>
      {findings.length === 0 ? (
        <p className={styles.empty}>No findings matched the current rules in this session. This does not prove the journey succeeded.</p>
      ) : (
        <ol className={styles.list}>
          {findings.map((finding) => (
            <li className={styles.finding} key={finding.id}>
              <div className={styles.findingHeading}>
                <h4>{finding.title}</h4>
                <span className={`${styles.severity} ${styles[finding.severity]}`}>{finding.severity}</span>
              </div>
              <p>{finding.explanation}</p>
              <div className={styles.evidence} aria-label={`Evidence for ${finding.title}`}>
                {finding.eventIds.map((eventId, index) => {
                  const event = eventById.get(eventId);
                  if (!event || event.sessionId !== sessionId) return null;
                  return (
                    <button key={eventId} type="button" onClick={() => onSelectEvent(eventId)}
                      aria-label={evidenceLabel(finding, index, event.message)}>
                      Inspect event {index + 1}: {event.message}
                    </button>
                  );
                })}
              </div>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
};
