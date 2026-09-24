import { useId, useMemo, useState } from "react";

import { findTraceFindings, type TraceFinding } from "../lib/trace-findings";
import type { NormalizedTrace } from "../lib/trace-model";
import styles from "./FindingsPanel.module.css";

export interface FindingsPanelProps {
  trace: NormalizedTrace;
  sessionId: string;
  onSelectEvent: (eventId: string) => void;
}

export type FindingSeverityFilter = "all" | TraceFinding["severity"];

export const filterFindingsBySeverity = (
  findings: readonly TraceFinding[],
  severity: FindingSeverityFilter,
): TraceFinding[] => severity === "all" ? [...findings] : findings.filter((finding) => finding.severity === severity);

const evidenceLabel = (finding: TraceFinding, index: number, message: string): string =>
  finding.eventIds.length === 1
    ? `Inspect event: ${message}`
    : `Inspect evidence ${index + 1} of ${finding.eventIds.length}: ${message}`;

/** A review aid for the selected session; findings are heuristics, not diagnoses. */
export const FindingsPanel = ({ trace, sessionId, onSelectEvent }: FindingsPanelProps) => {
  const titleId = useId();
  const severityId = useId();
  const resultsId = useId();
  const statusId = useId();
  const [severity, setSeverity] = useState<FindingSeverityFilter>("all");
  const allFindings = useMemo(
    () => findTraceFindings(trace).filter((finding) => finding.sessionId === sessionId),
    [trace, sessionId],
  );
  const findings = useMemo(() => filterFindingsBySeverity(allFindings, severity), [allFindings, severity]);
  const eventById = useMemo(() => new Map(trace.events.map((event) => [event.id, event])), [trace]);

  return (
    <section className={styles.panel} aria-labelledby={titleId}>
      <div className={styles.heading}>
        <div>
          <p className={styles.eyebrow}>Review prompts</p>
          <h3 id={titleId}>Trace findings</h3>
        </div>
        <span className={styles.count} aria-label={`${findings.length} of ${allFindings.length} findings shown`}>{findings.length}</span>
      </div>
      <p className={styles.disclaimer}>
        Rules flag recorded patterns for investigation. They do not establish a root cause or prove that an event caused another.
      </p>
      <div className={styles.filters}>
        <label htmlFor={severityId}>Severity</label>
        <select id={severityId} value={severity} aria-controls={resultsId} aria-describedby={statusId}
          onChange={(event) => setSeverity(event.currentTarget.value as FindingSeverityFilter)}>
          <option value="all">All severities</option>
          <option value="warning">Warnings</option>
          <option value="critical">Critical</option>
        </select>
      </div>
      <div id={resultsId}>
        <p className={styles.filterStatus} id={statusId} role="status" aria-live="polite">
          Showing {findings.length} of {allFindings.length} findings for this session.
        </p>
        {allFindings.length === 0 ? (
          <p className={styles.empty}>No findings matched the current rules in this session. This does not prove the journey succeeded.</p>
        ) : findings.length === 0 ? (
          <p className={styles.empty}>No {severity} findings matched this session. Choose another severity to review the remaining prompts.</p>
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
      </div>
    </section>
  );
};
