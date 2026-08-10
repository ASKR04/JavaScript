import type {
  ProjectWorkspace,
  WorkStatus,
} from "../../lib/project-state";
import { workStatuses } from "../../lib/project-state";
import type { ProjectBriefPatch } from "../../lib/workspace-state";
import { StatusBadge } from "../../components/StatusBadge";
import { ProjectBriefEditor } from "./ProjectBriefEditor";

type DashboardProps = {
  workspace: ProjectWorkspace;
  onBriefChange: (patch: ProjectBriefPatch) => void;
  onFeatureStatusChange: (featureId: string, status: WorkStatus) => void;
};

export function Dashboard({
  workspace,
  onBriefChange,
  onFeatureStatusChange,
}: DashboardProps) {
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
          <article className="feature-card" key={feature.id}>
            <StatusBadge status={feature.status} />
            <h3>{feature.title}</h3>
            <p>{feature.description}</p>
            <label className="status-control">
              Workflow status
              <select
                value={feature.status}
                onChange={(event) =>
                  onFeatureStatusChange(
                    feature.id,
                    event.target.value as WorkStatus,
                  )
                }
              >
                {workStatuses.map((status) => (
                  <option key={status} value={status}>
                    {status[0].toUpperCase() + status.slice(1)}
                  </option>
                ))}
              </select>
            </label>
          </article>
        ))}
      </div>

      <ProjectBriefEditor workspace={workspace} onChange={onBriefChange} />
    </section>
  );
}
