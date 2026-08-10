import type { ProjectWorkspace, WorkStatus } from "./project-state";

const STORAGE_KEY = "signalforge.workspace.v1";
const SNAPSHOT_VERSION = 1;

type StorageReader = Pick<Storage, "getItem">;
type StorageWriter = Pick<Storage, "setItem" | "removeItem">;

export type WorkspaceSnapshot = {
  workspace: ProjectWorkspace;
  savedAt: string;
};

type StoredSnapshot = WorkspaceSnapshot & {
  version: number;
};

const validStatuses: WorkStatus[] = [
  "planned",
  "active",
  "blocked",
  "complete",
];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function hasStringFields(
  value: Record<string, unknown>,
  fields: string[],
): boolean {
  return fields.every((field) => typeof value[field] === "string");
}

function hasValidStatus(value: Record<string, unknown>): boolean {
  return validStatuses.includes(value.status as WorkStatus);
}

export function isProjectWorkspace(value: unknown): value is ProjectWorkspace {
  if (!isRecord(value)) return false;

  const hasBrief = hasStringFields(value, [
    "name",
    "description",
    "audience",
    "value",
    "nextProofPoint",
  ]);
  const featuresAreValid =
    Array.isArray(value.features) &&
    value.features.every(
      (feature) =>
        isRecord(feature) &&
        hasStringFields(feature, ["id", "title", "description"]) &&
        hasValidStatus(feature),
    );
  const roadmapIsValid =
    Array.isArray(value.roadmap) &&
    value.roadmap.every(
      (item) =>
        isRecord(item) &&
        hasStringFields(item, ["id", "sequence", "title", "outcome"]) &&
        hasValidStatus(item),
    );
  const decisionsAreValid =
    Array.isArray(value.decisions) &&
    value.decisions.every(
      (decision) =>
        isRecord(decision) &&
        hasStringFields(decision, ["id", "title", "context", "impact"]),
    );

  return hasBrief && featuresAreValid && roadmapIsValid && decisionsAreValid;
}

export function loadWorkspace(
  storage: StorageReader,
): WorkspaceSnapshot | null {
  try {
    const serialized = storage.getItem(STORAGE_KEY);
    if (!serialized) return null;

    const snapshot: unknown = JSON.parse(serialized);
    if (
      !isRecord(snapshot) ||
      snapshot.version !== SNAPSHOT_VERSION ||
      typeof snapshot.savedAt !== "string" ||
      !isProjectWorkspace(snapshot.workspace)
    ) {
      return null;
    }

    return {
      workspace: snapshot.workspace,
      savedAt: snapshot.savedAt,
    };
  } catch {
    return null;
  }
}

export function saveWorkspace(
  storage: StorageWriter,
  workspace: ProjectWorkspace,
  now = new Date(),
): WorkspaceSnapshot {
  const snapshot: StoredSnapshot = {
    version: SNAPSHOT_VERSION,
    workspace,
    savedAt: now.toISOString(),
  };

  storage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
  return snapshot;
}

export function clearWorkspace(storage: StorageWriter): void {
  storage.removeItem(STORAGE_KEY);
}
