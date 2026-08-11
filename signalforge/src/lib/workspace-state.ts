import type {
  Feature,
  ProjectWorkspace,
  RoadmapItem,
  WorkStatus,
} from "./project-state";

export type WorkItemDraft = {
  title: string;
  details: string;
};

export type WorkItemErrors = Partial<Record<keyof WorkItemDraft, string>>;

export type WorkspaceMutationResult = {
  workspace: ProjectWorkspace;
  errors: WorkItemErrors;
};

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

export function validateWorkItemDraft(
  draft: WorkItemDraft,
  existingTitles: string[],
): WorkItemErrors {
  const title = draft.title.trim();
  const details = draft.details.trim();
  const errors: WorkItemErrors = {};

  if (title.length < 3) {
    errors.title = "Use at least 3 characters for a useful title.";
  } else if (
    existingTitles.some(
      (existingTitle) =>
        existingTitle.trim().toLowerCase() === title.toLowerCase(),
    )
  ) {
    errors.title = "Choose a title that is not already in this workspace.";
  }

  if (details.length < 12) {
    errors.details = "Describe the intended outcome in at least 12 characters.";
  }

  return errors;
}

function hasErrors(errors: WorkItemErrors): boolean {
  return Object.keys(errors).length > 0;
}

function createWorkItemId(): string {
  return crypto.randomUUID();
}

export function addFeature(
  workspace: ProjectWorkspace,
  draft: WorkItemDraft,
  id?: string,
): WorkspaceMutationResult {
  const errors = validateWorkItemDraft(
    draft,
    workspace.features.map((feature) => feature.title),
  );
  if (hasErrors(errors)) return { workspace, errors };

  const feature: Feature = {
    id: id ?? createWorkItemId(),
    title: draft.title.trim(),
    description: draft.details.trim(),
    status: "planned",
  };

  return {
    workspace: { ...workspace, features: [...workspace.features, feature] },
    errors: {},
  };
}

export function removeFeature(
  workspace: ProjectWorkspace,
  featureId: string,
): ProjectWorkspace {
  return {
    ...workspace,
    features: workspace.features.filter((feature) => feature.id !== featureId),
  };
}

export function addRoadmapItem(
  workspace: ProjectWorkspace,
  draft: WorkItemDraft,
  id?: string,
): WorkspaceMutationResult {
  const errors = validateWorkItemDraft(
    draft,
    workspace.roadmap.map((item) => item.title),
  );
  if (hasErrors(errors)) return { workspace, errors };

  const roadmapItem: RoadmapItem = {
    id: id ?? createWorkItemId(),
    sequence: String(workspace.roadmap.length + 1).padStart(2, "0"),
    title: draft.title.trim(),
    outcome: draft.details.trim(),
    status: "planned",
  };

  return {
    workspace: {
      ...workspace,
      roadmap: [...workspace.roadmap, roadmapItem],
    },
    errors: {},
  };
}

export function removeRoadmapItem(
  workspace: ProjectWorkspace,
  roadmapId: string,
): ProjectWorkspace {
  return {
    ...workspace,
    roadmap: workspace.roadmap
      .filter((item) => item.id !== roadmapId)
      .map((item, index) => ({
        ...item,
        sequence: String(index + 1).padStart(2, "0"),
      })),
  };
}
