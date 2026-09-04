import type { ProjectWorkspace } from "./project-state";
import type {
  WorkspaceLoadResult,
  WorkspaceSnapshot,
} from "./persistence";
import { summarizeWorkspaceChanges } from "./workspace-sync";

export type WorkspaceStorageRecoveryPlan =
  | { kind: "save-current" }
  | { kind: "still-unavailable" }
  | { kind: "protect-unreadable"; serialized: string }
  | { kind: "reconcile"; snapshot: WorkspaceSnapshot }
  | { kind: "conflict"; snapshot: WorkspaceSnapshot };

export function planWorkspaceStorageRecovery(
  loadResult: WorkspaceLoadResult,
  currentWorkspace: ProjectWorkspace,
): WorkspaceStorageRecoveryPlan {
  if (loadResult.status === "empty") return { kind: "save-current" };
  if (loadResult.status === "unavailable") {
    return { kind: "still-unavailable" };
  }
  if (loadResult.status === "invalid") {
    return {
      kind: "protect-unreadable",
      serialized: loadResult.serialized,
    };
  }

  return {
    kind:
      summarizeWorkspaceChanges(
        currentWorkspace,
        loadResult.snapshot.workspace,
      ).length === 0
        ? "reconcile"
        : "conflict",
    snapshot: loadResult.snapshot,
  };
}
