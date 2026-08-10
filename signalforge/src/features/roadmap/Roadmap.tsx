import type {
  RoadmapItem,
  WorkStatus,
} from "../../lib/project-state";
import { workStatuses } from "../../lib/project-state";
import { StatusBadge } from "../../components/StatusBadge";

type RoadmapProps = {
  items: RoadmapItem[];
  onStatusChange: (roadmapId: string, status: WorkStatus) => void;
};

export function Roadmap({ items, onStatusChange }: RoadmapProps) {
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
              <StatusBadge status={item.status} />
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
    </section>
  );
}
