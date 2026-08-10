import type { WorkStatus } from "../lib/project-state";

type StatusBadgeProps = {
  status: WorkStatus;
};

const statusLabels: Record<WorkStatus, string> = {
  planned: "Planned",
  active: "Active",
  blocked: "Blocked",
  complete: "Complete",
};

export function StatusBadge({ status }: StatusBadgeProps) {
  return <span className={`status-badge status-${status}`}>{statusLabels[status]}</span>;
}

