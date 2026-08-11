import type {
  RoadmapItem,
  WorkStatus,
} from "../../lib/project-state";
import { workStatuses } from "../../lib/project-state";
import { StatusBadge } from "../../components/StatusBadge";
import { WorkItemComposer } from "../../components/WorkItemComposer";
import type {
  WorkItemDraft,
  WorkItemErrors,
} from "../../lib/workspace-state";

type RoadmapProps = {
  items: RoadmapItem[];
  onCreate: (draft: WorkItemDraft) => WorkItemErrors;
  onRemove: (roadmapId: string) => void;
  onStatusChange: (roadmapId: string, status: WorkStatus) => void;
};

export function Roadmap({
  items,
  onCreate,
  onRemove,
  onStatusChange,
}: RoadmapProps) {
  return (
    <section className="panel" id="roadmap">
      <div className="section-heading">
        <p className="eyebrow">Roadmap</p>
        <h2>Milestones shaped for visible progress</h2>
      </div>

      <div className="timeline">
        {items.map((item) => (
          <article className="timeline-item" key={item.id}>
            <div className="timeline-day">{item.sequence}</div>
            <div>
              <div className="card-toolbar">
                <StatusBadge status={item.status} />
                <button
                  className="text-button danger-button"
                  type="button"
                  onClick={() => onRemove(item.id)}
                  aria-label={`Remove milestone ${item.title}`}
                >
                  Remove
                </button>
              </div>
              <h3>{item.title}</h3>
              <p>{item.outcome}</p>
              <label className="status-control roadmap-status-control">
                Milestone status
                <select
                  value={item.status}
                  onChange={(event) =>
                    onStatusChange(item.id, event.target.value as WorkStatus)
                  }
                >
                  {workStatuses.map((status) => (
                    <option key={status} value={status}>
                      {status[0].toUpperCase() + status.slice(1)}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </article>
        ))}
      </div>

      <WorkItemComposer
        title="Add the next visible proof point"
        description="Define a milestone around an outcome that can be demonstrated, reviewed, or tested."
        titleLabel="Milestone title"
        detailsLabel="Expected outcome"
        submitLabel="Add milestone"
        onSubmit={onCreate}
      />
    </section>
  );
}
