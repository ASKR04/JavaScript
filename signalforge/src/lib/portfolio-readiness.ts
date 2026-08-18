import type { ProjectWorkspace } from "./project-state";

export type ReadinessItem = {
  id: string;
  label: string;
  guidance: string;
  complete: boolean;
};

export type PortfolioReadiness = {
  completed: number;
  total: number;
  percent: number;
  ready: boolean;
  items: ReadinessItem[];
};

function hasText(value: string): boolean {
  return value.trim().length > 0;
}

export function getPortfolioReadiness(
  workspace: ProjectWorkspace,
): PortfolioReadiness {
  const items: ReadinessItem[] = [
    {
      id: "brief",
      label: "Project brief is complete",
      guidance: "Define the purpose, audience, value, and next proof point.",
      complete: [
        workspace.name,
        workspace.description,
        workspace.audience,
        workspace.value,
        workspace.nextProofPoint,
      ].every(hasText),
    },
    {
      id: "features",
      label: "Feature scope is delivered",
      guidance: "Move every tracked feature to complete before publishing.",
      complete:
        workspace.features.length > 0 &&
        workspace.features.every((feature) => feature.status === "complete"),
    },
    {
      id: "roadmap",
      label: "Roadmap milestones are closed",
      guidance: "Resolve active, planned, or blocked milestones.",
      complete:
        workspace.roadmap.length > 0 &&
        workspace.roadmap.every((item) => item.status === "complete"),
    },
    {
      id: "decisions",
      label: "Architecture choices are explained",
      guidance: "Capture at least one decision and its engineering impact.",
      complete:
        workspace.decisions.length > 0 &&
        workspace.decisions.every(
          (decision) =>
            hasText(decision.title) &&
            hasText(decision.context) &&
            hasText(decision.impact),
        ),
    },
    {
      id: "commits",
      label: "Delivery evidence is recorded",
      guidance: "Add at least one commit narrative with verification proof.",
      complete:
        workspace.commitNarratives.length > 0 &&
        workspace.commitNarratives.every(
          (narrative) =>
            hasText(narrative.summary) &&
            hasText(narrative.implementation) &&
            hasText(narrative.evidence),
        ),
    },
  ];
  const completed = items.filter((item) => item.complete).length;
  const total = items.length;

  return {
    completed,
    total,
    percent: Math.round((completed / total) * 100),
    ready: completed === total,
    items,
  };
}
