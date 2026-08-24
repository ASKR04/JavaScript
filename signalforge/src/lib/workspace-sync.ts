import {
  parseWorkspaceSnapshot,
  type WorkspaceSnapshot,
} from "./persistence";
import type { ProjectWorkspace } from "./project-state";

export type WorkspaceChangeSummary = {
  key: "brief" | "features" | "roadmap" | "decisions" | "commits";
  label: string;
  detail: string;
};

export type ExternalWorkspaceUpdate = {
  kind: "identical" | "conflict";
  snapshot: WorkspaceSnapshot;
};

const briefFields: Array<
  keyof Pick<
    ProjectWorkspace,
    "name" | "description" | "audience" | "value" | "nextProofPoint"
  >
> = ["name", "description", "audience", "value", "nextProofPoint"];

function pluralize(count: number, singular: string): string {
  return `${count} ${singular}${count === 1 ? "" : "s"}`;
}

function recordsDiffer(left: object, right: object): boolean {
  const leftEntries = Object.entries(left);
  const rightRecord = right as Record<string, unknown>;

  return (
    leftEntries.length !== Object.keys(right).length ||
    leftEntries.some(([key, value]) => rightRecord[key] !== value)
  );
}

function summarizeCollection<T extends { id: string }>(
  current: T[],
  incoming: T[],
): string | null {
  const currentById = new Map(current.map((item) => [item.id, item]));
  const incomingById = new Map(incoming.map((item) => [item.id, item]));
  const added = incoming.filter((item) => !currentById.has(item.id)).length;
  const removed = current.filter((item) => !incomingById.has(item.id)).length;
  const updated = incoming.filter((item) => {
    const existing = currentById.get(item.id);
    return existing && recordsDiffer(existing, item);
  }).length;
  const changes = [
    added ? pluralize(added, "added item") : null,
    removed ? pluralize(removed, "removed item") : null,
    updated ? pluralize(updated, "updated item") : null,
  ].filter((change): change is string => Boolean(change));

  return changes.length > 0 ? changes.join(", ") : null;
}

function appendCollectionSummary<T extends { id: string }>(
  summary: WorkspaceChangeSummary[],
  key: WorkspaceChangeSummary["key"],
  label: string,
  current: T[],
  incoming: T[],
): void {
  const detail = summarizeCollection(current, incoming);
  if (detail) summary.push({ key, label, detail });
}

export function summarizeWorkspaceChanges(
  current: ProjectWorkspace,
  incoming: ProjectWorkspace,
): WorkspaceChangeSummary[] {
  const summary: WorkspaceChangeSummary[] = [];
  const changedBriefFields = briefFields.filter(
    (field) => current[field] !== incoming[field],
  ).length;

  if (changedBriefFields > 0) {
    summary.push({
      key: "brief",
      label: "Project brief",
      detail: pluralize(changedBriefFields, "changed field"),
    });
  }

  appendCollectionSummary(
    summary,
    "features",
    "Features",
    current.features,
    incoming.features,
  );
  appendCollectionSummary(
    summary,
    "roadmap",
    "Roadmap",
    current.roadmap,
    incoming.roadmap,
  );
  appendCollectionSummary(
    summary,
    "decisions",
    "Architecture decisions",
    current.decisions,
    incoming.decisions,
  );
  appendCollectionSummary(
    summary,
    "commits",
    "Commit narratives",
    current.commitNarratives,
    incoming.commitNarratives,
  );

  return summary;
}

export function selectNewerWorkspaceSnapshot(
  serialized: string,
  currentSavedAt: string | null,
): WorkspaceSnapshot | null {
  const candidate = parseWorkspaceSnapshot(serialized);
  if (!candidate) return null;
  if (!currentSavedAt) return candidate;

  const currentTime = Date.parse(currentSavedAt);
  if (Number.isNaN(currentTime)) return candidate;

  return Date.parse(candidate.savedAt) > currentTime ? candidate : null;
}

export function classifyExternalWorkspaceUpdate(
  serialized: string,
  currentWorkspace: ProjectWorkspace,
  currentSavedAt: string | null,
): ExternalWorkspaceUpdate | null {
  const snapshot = selectNewerWorkspaceSnapshot(serialized, currentSavedAt);
  if (!snapshot) return null;

  return {
    kind:
      summarizeWorkspaceChanges(currentWorkspace, snapshot.workspace).length ===
      0
        ? "identical"
        : "conflict",
    snapshot,
  };
}
