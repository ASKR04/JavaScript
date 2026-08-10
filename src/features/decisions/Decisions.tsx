import type { ArchitectureDecision } from "../../lib/project-state";

type DecisionsProps = {
  decisions: ArchitectureDecision[];
};

export function Decisions({ decisions }: DecisionsProps) {
  return (
    <section className="panel" id="decisions">
      <div className="section-heading">
        <p className="eyebrow">Architecture</p>
        <h2>Decisions with context and consequences</h2>
      </div>

      <div className="decision-list">
        {decisions.map((decision) => (
          <article className="decision-card" key={decision.id}>
            <p className="decision-id">{decision.id}</p>
            <h3>{decision.title}</h3>
            <p>{decision.context}</p>
            <strong>{decision.impact}</strong>
          </article>
        ))}
      </div>
    </section>
  );
}

