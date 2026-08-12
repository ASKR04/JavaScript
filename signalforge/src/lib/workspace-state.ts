import type {
  ArchitectureDecision,
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

export type DecisionDraft = {
  title: string;
  context: string;
  impact: string;
};

export type DecisionErrors = Partial<Record<keyof DecisionDraft, string>>;

export type DecisionMutationResult = {
  workspace: ProjectWorkspace;
  errors: DecisionErrors;
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

export function validateDecisionDraft(
  draft: DecisionDraft,
  existingTitles: string[],
): DecisionErrors {
  const title = draft.title.trim();
  const context = draft.context.trim();
  const impact = draft.impact.trim();
  const errors: DecisionErrors = {};

  if (title.length < 3) {
    errors.title = "Use at least 3 characters for a useful decision title.";
  } else if (
    existingTitles.some(
      (existingTitle) =>
        existingTitle.trim().toLowerCase() === title.toLowerCase(),
    )
  ) {
    errors.title = "Choose a title that is not already in the decision log.";
  }

  if (context.length < 12) {
    errors.context = "Explain the decision context in at least 12 characters.";
  }

  if (impact.length < 12) {
    errors.impact = "Describe the consequence in at least 12 characters.";
  }

  return errors;
}

function hasDecisionErrors(errors: DecisionErrors): boolean {
  return Object.keys(errors).length > 0;
}

function nextDecisionId(decisions: ArchitectureDecision[]): string {
  const highestSequence = decisions.reduce((highest, decision) => {
    const match = /^ADR-(\d+)$/i.exec(decision.id);
    return match ? Math.max(highest, Number(match[1])) : highest;
  }, 0);

  return `ADR-${String(highestSequence + 1).padStart(3, "0")}`;
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

export function addArchitectureDecision(
  workspace: ProjectWorkspace,
  draft: DecisionDraft,
): DecisionMutationResult {
  const errors = validateDecisionDraft(
    draft,
    workspace.decisions.map((decision) => decision.title),
  );
  if (hasDecisionErrors(errors)) return { workspace, errors };

  const decision: ArchitectureDecision = {
    id: nextDecisionId(workspace.decisions),
    title: draft.title.trim(),
    context: draft.context.trim(),
    impact: draft.impact.trim(),
  };

  return {
    workspace: {
      ...workspace,
      decisions: [...workspace.decisions, decision],
    },
    errors: {},
  };
}

export function updateArchitectureDecision(
  workspace: ProjectWorkspace,
  decisionId: string,
  draft: DecisionDraft,
): DecisionMutationResult {
  const errors = validateDecisionDraft(
    draft,
    workspace.decisions
      .filter((decision) => decision.id !== decisionId)
      .map((decision) => decision.title),
  );
  if (hasDecisionErrors(errors)) return { workspace, errors };

  return {
    workspace: {
      ...workspace,
      decisions: workspace.decisions.map((decision) =>
        decision.id === decisionId
          ? {
              ...decision,
              title: draft.title.trim(),
              context: draft.context.trim(),
              impact: draft.impact.trim(),
            }
          : decision,
      ),
    },
    errors: {},
  };
}

export function removeArchitectureDecision(
  workspace: ProjectWorkspace,
  decisionId: string,
): ProjectWorkspace {
  return {
    ...workspace,
    decisions: workspace.decisions.filter(
      (decision) => decision.id !== decisionId,
    ),
  };
}
