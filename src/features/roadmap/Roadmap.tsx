import type { RoadmapItem } from "../../lib/project-state";
import { StatusBadge } from "../../components/StatusBadge";

type RoadmapProps = {
  items: RoadmapItem[];
};

export function Roadmap({ items }: RoadmapProps) {
  return (
    <section className="panel" id="roadmap">
      <div className="section-heading">
        <p className="eyebrow">Roadmap</p>
        <h2>Milestones shaped for visible progress</h2>
      </div>

      <div className="timeline">
        {items.map((item) => (
          <article className="timeline-item" key={item.title}>
            <div className="timeline-day">{item.sequence}</div>
            <div>
              <StatusBadge status={item.status} />
              <h3>{item.title}</h3>
              <p>{item.outcome}</p>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

