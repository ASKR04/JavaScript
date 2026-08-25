import type { ProjectWorkspace } from "./project-state";

export type WorkspaceReplacementOperation = "backup restore" | "sample reset";

export type WorkspaceReplacementRecovery = {
  workspace: ProjectWorkspace;
  operation: WorkspaceReplacementOperation;
  direction: "undo" | "redo";
};

export type WorkspaceReplacementSwap = {
  workspace: ProjectWorkspace;
  recovery: WorkspaceReplacementRecovery;
};

export function beginWorkspaceReplacement(
  currentWorkspace: ProjectWorkspace,
  operation: WorkspaceReplacementOperation,
): WorkspaceReplacementRecovery {
  return {
    workspace: currentWorkspace,
    operation,
    direction: "undo",
  };
}

export function swapWorkspaceReplacement(
  currentWorkspace: ProjectWorkspace,
  recovery: WorkspaceReplacementRecovery,
): WorkspaceReplacementSwap {
  return {
    workspace: recovery.workspace,
    recovery: {
      workspace: currentWorkspace,
      operation: recovery.operation,
      direction: recovery.direction === "undo" ? "redo" : "undo",
    },
  };
}
