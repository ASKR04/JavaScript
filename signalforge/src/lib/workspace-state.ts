import type {
  ProjectWorkspace,
  WorkStatus,
} from "./project-state";

export type ProjectBriefPatch = Partial<
  Pick<
    ProjectWorkspace,
    "name" | "description" | "audience" | "value" | "nextProofPoint"
  >
>;

export function updateProjectBrief(
  workspace: ProjectWorkspace,
  patch: ProjectBriefPatch,
): ProjectWorkspace {
  return { ...workspace, ...patch };
}

export function updateFeatureStatus(
  workspace: ProjectWorkspace,
  featureId: string,
  status: WorkStatus,
): ProjectWorkspace {
  return {
    ...workspace,
    features: workspace.features.map((feature) =>
      feature.id === featureId ? { ...feature, status } : feature,
    ),
  };
}

export function updateRoadmapStatus(
  workspace: ProjectWorkspace,
  roadmapId: string,
  status: WorkStatus,
): ProjectWorkspace {
  return {
    ...workspace,
    roadmap: workspace.roadmap.map((item) =>
      item.id === roadmapId ? { ...item, status } : item,
    ),
  };
}
