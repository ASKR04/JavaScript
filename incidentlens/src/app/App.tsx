import { useMemo, useState } from "react";
import { syntheticCheckoutIncident } from "../fixtures/synthetic-checkout-incident";
import { correlateIncident } from "../lib/correlation";
import {
  buildEvidenceTimeline,
  buildReviewedReport,
  buildServicePath,
  citationForItem,
  type TimelineSource,
} from "../lib/investigation-view";

const result = correlateIncident(syntheticCheckoutIncident);
const timeline = buildEvidenceTimeline(syntheticCheckoutIncident);
const servicePath = buildServicePath(syntheticCheckoutIncident, result);
const sources: TimelineSource[] = ["trace", "log", "deployment", "config"];

const downloadReport = (markdown: string, fileName: string) => {
  const url = URL.createObjectURL(new Blob([markdown], { type: "text/markdown;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.append(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
};

export const App = () => {
  const [enabledSources, setEnabledSources] = useState<ReadonlySet<TimelineSource>>(new Set(sources));
  const [selectedId, setSelectedId] = useState(result.earliestAbnormal?.id ?? timeline[0]?.id ?? "");
  const [reviewed, setReviewed] = useState(false);
  const [reviewerNote, setReviewerNote] = useState("");
  const [status, setStatus] = useState("Review the evidence and confirm the report before export.");
  const visibleTimeline = useMemo(() => timeline.filter(({ source }) => enabledSources.has(source)), [enabledSources]);
  const selected = visibleTimeline.find(({ id }) => id === selectedId) ?? visibleTimeline[0];

  const toggleSource = (source: TimelineSource) => {
    const next = new Set(enabledSources);
    if (next.has(source)) next.delete(source); else next.add(source);
    setEnabledSources(next);
  };

  const exportReport = () => {
    if (!reviewed) return;
    try {
      const report = buildReviewedReport(syntheticCheckoutIncident, result, reviewerNote);
      downloadReport(report.markdown, report.fileName);
      setStatus(`${report.fileName} downloaded locally for human review and sharing.`);
    } catch {
      setStatus("The local report download could not start. Check browser permissions and retry.");
    }
  };

  return (
    <div className="app-shell">
      <a className="skip-link" href="#investigation">Skip to investigation</a>
      <header className="site-header">
        <a href="#top" className="brand" aria-label="IncidentLens home"><span>IL</span><strong>IncidentLens</strong></a>
        <span className="boundary-pill">Synthetic evidence only</span>
      </header>
      <main id="top">
        <section className="hero" aria-labelledby="page-title">
          <div><p className="eyebrow">Evidence-first incident triage</p><h1 id="page-title">Find the first abnormal signal. Keep the uncertainty.</h1><p>IncidentLens correlates a fictional ticket, trace, logs, changes, and ownership into a source-linked lead. It does not diagnose a root cause or assign blame.</p></div>
          <aside aria-label="Safety boundary"><strong>Read-only by design</strong><p>No live connector, credential, company system, or production record is accessed.</p></aside>
        </section>
        <section className="ticket" aria-labelledby="incident-title">
          <div><p className="eyebrow">{syntheticCheckoutIncident.ticket.id}</p><h2 id="incident-title">{syntheticCheckoutIncident.ticket.title}</h2><p>{syntheticCheckoutIncident.ticket.customerImpact}</p></div>
          <dl className="summary-grid"><div><dt>Evidence relationship</dt><dd>{result.location}</dd></div><div><dt>Coverage confidence</dt><dd>{result.confidence.level} · {Math.round(result.confidence.score * 100)}%</dd></div><div><dt>Evidence lead</dt><dd>{result.earliestAbnormal?.service ?? "Not identified"}</dd></div></dl>
        </section>
        <section className="investigation" id="investigation" aria-labelledby="investigation-title">
          <div className="section-heading"><div><p className="eyebrow">Investigation workspace</p><h2 id="investigation-title">Trace the evidence path</h2></div><p>{result.explanation}</p></div>
          <section className="service-path" aria-labelledby="path-title"><div className="panel-heading"><h3 id="path-title">Service path</h3><span>Ownership-backed relationships</span></div><ol>{servicePath.map((node) => <li key={node.service} className={`path-node path-node--${node.role.replace(" ", "-")}`}><span>{node.role}</span><strong>{node.service}</strong><small>{node.team}</small></li>)}</ol></section>
          <div className="evidence-grid">
            <section className="timeline-panel" aria-labelledby="timeline-title">
              <div className="panel-heading"><div><p className="eyebrow">Ordered sources</p><h3 id="timeline-title">Evidence timeline</h3></div><span>{visibleTimeline.length} of {timeline.length}</span></div>
              <fieldset><legend>Filter evidence sources</legend>{sources.map((source) => <label key={source}><input type="checkbox" checked={enabledSources.has(source)} onChange={() => toggleSource(source)} />{source}</label>)}</fieldset>
              {visibleTimeline.length ? <ol className="timeline-list">{visibleTimeline.map((item) => <li key={item.id}><button type="button" aria-pressed={selected?.id === item.id} onClick={() => setSelectedId(item.id)}><span className={`source source--${item.source}`}>{item.source}</span><strong>{item.label}</strong><small>{item.service} · {new Date(item.observedAt).toLocaleTimeString()}</small>{item.abnormal && <em>Explicit abnormal signal</em>}</button></li>)}</ol> : <p className="empty-state">No evidence sources are selected. Enable a source to continue reviewing.</p>}
            </section>
            <aside className="citation-panel" aria-labelledby="citation-title" aria-live="polite"><p className="eyebrow">Selected citation</p>{selected ? <><h3 id="citation-title">{selected.label}</h3><span className={`source source--${selected.source}`}>{selected.source}</span><dl><div><dt>Record</dt><dd>{citationForItem(selected).recordId}</dd></div><div><dt>Service</dt><dd>{selected.service}</dd></div><div><dt>Observed</dt><dd>{new Date(selected.observedAt).toLocaleString()}</dd></div><div><dt>Evidence</dt><dd>{selected.abnormal ? "Explicitly abnormal" : "Context only"}</dd></div></dl><p>{selected.detail}</p></> : <><h3 id="citation-title">No citation selected</h3><p>Enable an evidence source to inspect its record.</p></>}</aside>
          </div>
          <section className={`missing-evidence ${result.missingEvidence.length ? "missing-evidence--open" : ""}`} aria-labelledby="missing-title"><div><p className="eyebrow">Evidence gaps</p><h3 id="missing-title">{result.missingEvidence.length ? "Missing context limits this lead" : "All expected synthetic source groups are present"}</h3></div>{result.missingEvidence.length ? <ul>{result.missingEvidence.map((item) => <li key={item.source}><strong>{item.source}</strong> — {item.reason}</li>)}</ul> : <p>No expected source group is absent. This does not prove the lead is the root cause.</p>}</section>
          <section className="citations" aria-labelledby="citations-title"><div><p className="eyebrow">Corroborating records</p><h3 id="citations-title">Citations used for this lead</h3><p>{result.confidence.rationale}</p></div><ol>{result.citations.map((item) => <li key={`${item.source}:${item.recordId}`}><span>{item.source}</span><strong>{item.label}</strong><small>{item.observedAt ? new Date(item.observedAt).toLocaleString() : "Context only"}</small></li>)}</ol></section>
          <section className="export-panel" aria-labelledby="export-title"><div><p className="eyebrow">Human-reviewed export</p><h3 id="export-title">Create a source-linked triage note</h3><p>The report repeats uncertainty, missing evidence, and citations. It never labels the lead as a confirmed cause.</p></div><div className="review-form"><label htmlFor="reviewer-note">Reviewer note (optional)</label><textarea id="reviewer-note" value={reviewerNote} onChange={(event) => setReviewerNote(event.currentTarget.value)} maxLength={500} placeholder="Add what was checked or what should happen next." /><label className="confirm-review"><input type="checkbox" checked={reviewed} onChange={(event) => setReviewed(event.currentTarget.checked)} />I reviewed the cited evidence and understand this is a triage lead, not a diagnosis.</label><button type="button" onClick={exportReport} disabled={!reviewed}>Download reviewed report</button><p role="status" aria-live="polite">{status}</p></div></section>
        </section>
      </main>
      <footer>Fictional public data · deterministic evidence rules · human confirmation required</footer>
    </div>
  );
};
