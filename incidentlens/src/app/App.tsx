import { syntheticCheckoutIncident } from "../fixtures/synthetic-checkout-incident";
import { correlateIncident } from "../lib/correlation";

export const App = () => {
  const result = correlateIncident(syntheticCheckoutIncident);
  const event = result.earliestAbnormal;
  return (
    <main>
      <header className="hero">
        <p className="eyebrow">IncidentLens · synthetic foundation</p>
        <h1>Evidence before inference.</h1>
        <p>Correlate tickets, traces, logs, changes, and service ownership into a reviewable incident lead—without claiming more than the supplied evidence supports.</p>
      </header>
      <section className="incident" aria-labelledby="incident-title">
        <div>
          <p className="eyebrow">Public synthetic incident</p>
          <h2 id="incident-title">{syntheticCheckoutIncident.ticket.title}</h2>
          <p>{syntheticCheckoutIncident.ticket.customerImpact}</p>
        </div>
        <dl>
          <div><dt>First abnormal evidence</dt><dd>{event?.summary ?? "None found"}</dd></div>
          <div><dt>Service relationship</dt><dd>{result.location}</dd></div>
          <div><dt>Confidence</dt><dd>{result.confidence.level} · {Math.round(result.confidence.score * 100)}%</dd></div>
        </dl>
      </section>
      <section className="evidence" aria-labelledby="evidence-title">
        <div><p className="eyebrow">Evidence-backed explanation</p><h2 id="evidence-title">Why this is the lead</h2><p>{result.explanation}</p><p className="caveat">Confidence describes evidence coverage, not certainty that the lead is the root cause.</p></div>
        <ol>{result.citations.map((item) => <li key={`${item.source}:${item.recordId}`}><strong>{item.source}</strong><span>{item.label}</span><small>{item.observedAt ? new Date(item.observedAt).toLocaleString() : "Context only"}</small></li>)}</ol>
      </section>
      <footer>All records shown here are fictional and public-safe. No connector, production telemetry, company data, or VDI data is used.</footer>
    </main>
  );
};
