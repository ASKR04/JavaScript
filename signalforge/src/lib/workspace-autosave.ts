import type { ProjectWorkspace } from "./project-state";
import {
  saveWorkspace,
  type WorkspaceSnapshot,
} from "./persistence";

export type WorkspaceSaveStatus = "saving" | "saved" | "error";

export type WorkspaceAutosavePauseStatus = "conflict" | "recovery";

type WorkspaceAutosavePauseState = {
  hasExternalSnapshot: boolean;
  hasUnreadableWorkspace: boolean;
};

type StorageWriter = Pick<Storage, "setItem" | "removeItem">;

type WorkspaceAutosaveOptions<TimerId> = {
  storage: StorageWriter;
  delay?: number;
  schedule: (callback: () => void, delay: number) => TimerId;
  cancel: (timerId: TimerId) => void;
  onStatusChange: (
    status: WorkspaceSaveStatus,
    snapshot?: WorkspaceSnapshot,
  ) => void;
  getNow?: () => Date;
};

export type WorkspaceAutosave = {
  queue: (workspace: ProjectWorkspace) => void;
  flush: () => void;
  retry: () => void;
  cancel: () => void;
};

export function getWorkspaceAutosavePauseStatus({
  hasExternalSnapshot,
  hasUnreadableWorkspace,
}: WorkspaceAutosavePauseState): WorkspaceAutosavePauseStatus | null {
  if (hasExternalSnapshot) return "conflict";
  if (hasUnreadableWorkspace) return "recovery";
  return null;
}

export function createWorkspaceAutosave<TimerId>({
  storage,
  delay = 300,
  schedule,
  cancel,
  onStatusChange,
  getNow = () => new Date(),
}: WorkspaceAutosaveOptions<TimerId>): WorkspaceAutosave {
  let pending: { timerId: TimerId; workspace: ProjectWorkspace } | null = null;
  let failedWorkspace: ProjectWorkspace | null = null;

  function persist(workspace: ProjectWorkspace) {
    try {
      const snapshot = saveWorkspace(storage, workspace, getNow());
      failedWorkspace = null;
      onStatusChange("saved", snapshot);
    } catch {
      failedWorkspace = workspace;
      onStatusChange("error");
    }
  }

  function cancelPending() {
    if (!pending) return;

    cancel(pending.timerId);
    pending = null;
  }

  function retryFailedSave() {
    if (!failedWorkspace) return;

    const workspace = failedWorkspace;
    onStatusChange("saving");
    persist(workspace);
  }

  return {
    queue(workspace) {
      cancelPending();
      failedWorkspace = null;
      onStatusChange("saving");
      pending = {
        workspace,
        timerId: schedule(() => {
          pending = null;
          persist(workspace);
        }, delay),
      };
    },
    flush() {
      if (!pending) {
        retryFailedSave();
        return;
      }

      const { workspace } = pending;
      cancelPending();
      persist(workspace);
    },
    retry: retryFailedSave,
    cancel() {
      cancelPending();
      failedWorkspace = null;
    },
  };
}
