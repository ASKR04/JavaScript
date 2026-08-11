import type {
  ProjectWorkspace,
  WorkStatus,
} from "../../lib/project-state";
import { workStatuses } from "../../lib/project-state";
import type {
  ProjectBriefPatch,
  WorkItemDraft,
  WorkItemErrors,
} from "../../lib/workspace-state";
import { StatusBadge } from "../../components/StatusBadge";
import { WorkItemComposer } from "../../components/WorkItemComposer";
import { ProjectBriefEditor } from "./ProjectBriefEditor";

type DashboardProps = {
  workspace: ProjectWorkspace;
  onFeatureCreate: (draft: WorkItemDraft) => WorkItemErrors;
  onFeatureRemove: (featureId: string) => void;
  onBriefChange: (patch: ProjectBriefPatch) => void;
  onFeatureStatusChange: (featureId: string, status: WorkStatus) => void;
};

export function Dashboard({
  workspace,
  onFeatureCreate,
  onFeatureRemove,
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
            <div className="card-toolbar">
              <StatusBadge status={feature.status} />
              <button
                className="text-button danger-button"
                type="button"
                onClick={() => onFeatureRemove(feature.id)}
                aria-label={`Remove feature ${feature.title}`}
              >
                Remove
              </button>
            </div>
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

      <WorkItemComposer
        title="Plan another product capability"
        description="Capture a distinct capability and the value it should deliver. New features start in the planned state."
        titleLabel="Feature title"
        detailsLabel="Feature outcome"
        submitLabel="Add feature"
        onSubmit={onFeatureCreate}
      />

      <ProjectBriefEditor workspace={workspace} onChange={onBriefChange} />
    </section>
  );
}
