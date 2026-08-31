import {
  commitKinds,
  type CommitKind,
  type ProjectWorkspace,
  type WorkStatus,
} from "./project-state";

export const WORKSPACE_STORAGE_KEY = "signalforge.workspace.v1";
export const WORKSPACE_SCHEMA_VERSION = 2;

type StorageReader = Pick<Storage, "getItem">;
type StorageWriter = Pick<Storage, "setItem" | "removeItem">;
export type WorkspaceStorage = StorageReader & StorageWriter;

export type WorkspaceSnapshot = {
  workspace: ProjectWorkspace;
  savedAt: string;
};

export type WorkspaceLoadResult =
  | { status: "empty" }
  | { status: "ready"; snapshot: WorkspaceSnapshot }
  | { status: "invalid"; serialized: string }
  | { status: "unavailable" };

type StoredSnapshot = WorkspaceSnapshot & {
  version: number;
};

export function createWorkspaceStorage(
  resolveStorage: () => WorkspaceStorage,
): WorkspaceStorage {
  return {
    getItem(key) {
      return resolveStorage().getItem(key);
    },
    setItem(key, value) {
      resolveStorage().setItem(key, value);
    },
    removeItem(key) {
      resolveStorage().removeItem(key);
    },
  };
}

const validStatuses: WorkStatus[] = [
  "planned",
  "active",
  "blocked",
  "complete",
];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isIsoTimestamp(value: unknown): value is string {
  if (typeof value !== "string") return false;

  const parsed = new Date(value);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString() === value;
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

function hasValidCommitKind(value: Record<string, unknown>): boolean {
  return commitKinds.includes(value.kind as CommitKind);
}

type LegacyProjectWorkspace = Omit<ProjectWorkspace, "commitNarratives">;

function isLegacyProjectWorkspace(
  value: unknown,
): value is LegacyProjectWorkspace {
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

export function migrateProjectWorkspace(
  version: unknown,
  value: unknown,
): ProjectWorkspace | null {
  if (version === 1 && isLegacyProjectWorkspace(value)) {
    return { ...value, commitNarratives: [] };
  }

  if (version === WORKSPACE_SCHEMA_VERSION && isProjectWorkspace(value)) {
    return value;
  }

  return null;
}

export function isProjectWorkspace(value: unknown): value is ProjectWorkspace {
  if (!isLegacyProjectWorkspace(value) || !isRecord(value)) return false;

  const commitNarratives = (value as Record<string, unknown>)
    .commitNarratives;

  const commitNarrativesAreValid =
    Array.isArray(commitNarratives) &&
    commitNarratives.every(
      (narrative: unknown) =>
        isRecord(narrative) &&
        hasStringFields(narrative, [
          "id",
          "date",
          "scope",
          "summary",
          "implementation",
          "evidence",
        ]) &&
        hasValidCommitKind(narrative),
    );

  return commitNarrativesAreValid;
}

export function parseWorkspaceSnapshot(
  serialized: string,
): WorkspaceSnapshot | null {
  try {
    const snapshot: unknown = JSON.parse(serialized);
    if (!isRecord(snapshot) || !isIsoTimestamp(snapshot.savedAt)) {
      return null;
    }

    const workspace = migrateProjectWorkspace(
      snapshot.version,
      snapshot.workspace,
    );
    if (!workspace) return null;

    return {
      workspace,
      savedAt: snapshot.savedAt,
    };
  } catch {
    return null;
  }
}

export function loadWorkspace(
  storage: StorageReader,
): WorkspaceSnapshot | null {
  const result = readWorkspace(storage);
  return result.status === "ready" ? result.snapshot : null;
}

export function readWorkspace(storage: StorageReader): WorkspaceLoadResult {
  try {
    const serialized = storage.getItem(WORKSPACE_STORAGE_KEY);
    if (serialized === null) return { status: "empty" };

    const snapshot = parseWorkspaceSnapshot(serialized);
    return snapshot
      ? { status: "ready", snapshot }
      : { status: "invalid", serialized };
  } catch {
    return { status: "unavailable" };
  }
}

export function saveWorkspace(
  storage: StorageWriter,
  workspace: ProjectWorkspace,
  now = new Date(),
): WorkspaceSnapshot {
  const snapshot: StoredSnapshot = {
    version: WORKSPACE_SCHEMA_VERSION,
    workspace,
    savedAt: now.toISOString(),
  };

  storage.setItem(WORKSPACE_STORAGE_KEY, JSON.stringify(snapshot));
  return snapshot;
}

export function clearWorkspace(storage: StorageWriter): void {
  storage.removeItem(WORKSPACE_STORAGE_KEY);
}
