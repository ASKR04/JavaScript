import type { ProjectWorkspace } from "../../lib/project-state";
import { StatusBadge } from "../../components/StatusBadge";

type DashboardProps = {
  workspace: ProjectWorkspace;
};

export function Dashboard({ workspace }: DashboardProps) {
  const completedFeatures = workspace.features.filter(
    (feature) => feature.status === "complete",
  ).length;

  return (
    <section className="panel hero-panel" id="dashboard">
      <div className="panel-copy">
        <p className="eyebrow">Current Workspace</p>
        <h2>{workspace.name}</h2>
        <p>{workspace.description}</p>
      </div>

      <div className="metric-grid" aria-label="Project health metrics">
        <article>
          <span>{workspace.features.length}</span>
          <p>tracked features</p>
        </article>
        <article>
          <span>{completedFeatures}</span>
          <p>completed features</p>
        </article>
        <article>
          <span>{workspace.decisions.length}</span>
          <p>architecture decisions</p>
        </article>
      </div>

      <div className="feature-grid">
        {workspace.features.map((feature) => (
          <article className="feature-card" key={feature.title}>
            <StatusBadge status={feature.status} />
            <h3>{feature.title}</h3>
            <p>{feature.description}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

