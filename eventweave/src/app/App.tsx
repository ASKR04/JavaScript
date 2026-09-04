const buildSteps = [
  { label: "Trace contract", detail: "Versioned JSON + NDJSON", state: "ready" },
  { label: "Import boundary", detail: "Worker-safe validation", state: "ready" },
  { label: "Exploration", detail: "Timeline + causal chain", state: "next" },
] as const;

export const App = () => (
  <div className="app-shell">
    <header className="site-header">
      <a className="brand" href="#main" aria-label="EventWeave home">
        <span className="brand-mark" aria-hidden="true">EW</span>
        <span>
          <strong>EventWeave</strong>
          <small>Local workflow intelligence</small>
        </span>
      </a>
      <span className="privacy-pill">
        <span aria-hidden="true">●</span> On-device by design
      </span>
    </header>

    <main id="main">
      <section className="hero" aria-labelledby="hero-title">
        <div>
          <p className="eyebrow">Private trace exploration</p>
          <h1 id="hero-title">Find where a workflow first went off course.</h1>
          <p className="hero-copy">
            Turn sanitized product traces into causal evidence without sending telemetry beyond your browser.
          </p>
        </div>
        <div className="trace-card" aria-label="Example trace summary">
          <div className="trace-card-heading">
            <span>checkout-failure.ndjson</span>
            <span className="status-badge">Local</span>
          </div>
          <div className="trace-line">
            <span className="trace-node trace-node--success" aria-hidden="true" />
            <p><strong>Submit checkout</strong><small>shopper · 0 ms</small></p>
          </div>
          <div className="trace-line">
            <span className="trace-node trace-node--wait" aria-hidden="true" />
            <p><strong>Payment request</strong><small>checkout-api · 428 ms</small></p>
          </div>
          <div className="trace-line">
            <span className="trace-node trace-node--failure" aria-hidden="true" />
            <p><strong>Completion missing</strong><small>first divergence</small></p>
          </div>
        </div>
      </section>

      <section className="workspace" aria-labelledby="workspace-title">
        <div className="workspace-copy">
          <p className="eyebrow">Day 1 · Atlas foundation</p>
          <h2 id="workspace-title">The analysis boundary is ready.</h2>
          <p>
            EventWeave now has a documented trace format, deterministic normalization, actionable validation,
            realistic samples, and a dedicated worker contract. The interactive importer arrives in the next shift.
          </p>
          <div className="actions" aria-label="Available project resources">
            <a className="button button--primary" href="/samples/checkout-success.json" download>
              Download JSON sample
            </a>
            <a className="button button--secondary" href="/samples/checkout-failure.ndjson" download>
              Download NDJSON sample
            </a>
          </div>
        </div>

        <ol className="build-list" aria-label="Build progress">
          {buildSteps.map((step, index) => (
            <li key={step.label}>
              <span className={`step-number step-number--${step.state}`} aria-hidden="true">
                {index + 1}
              </span>
              <span><strong>{step.label}</strong><small>{step.detail}</small></span>
              <span className={`step-state step-state--${step.state}`}>
                {step.state === "ready" ? "Ready" : "Next"}
              </span>
            </li>
          ))}
        </ol>
      </section>
    </main>

    <footer>
      <p>Built for reproducible debugging, accessible evidence, and data that stays yours.</p>
    </footer>
  </div>
);
