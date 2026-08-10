import type { ProjectWorkspace } from "../../lib/project-state";

type SummaryProps = {
  workspace: ProjectWorkspace;
};

export function Summary({ workspace }: SummaryProps) {
  return (
    <section className="panel summary-panel" id="summary">
      <div className="section-heading">
        <p className="eyebrow">Portfolio Summary</p>
        <h2>Reusable proof for the final project story</h2>
      </div>

      <dl className="summary-list">
        <div>
          <dt>Audience</dt>
          <dd>{workspace.audience}</dd>
        </div>
        <div>
          <dt>Value</dt>
          <dd>{workspace.value}</dd>
        </div>
        <div>
          <dt>Next proof point</dt>
          <dd>{workspace.nextProofPoint}</dd>
        </div>
      </dl>
    </section>
  );
}

