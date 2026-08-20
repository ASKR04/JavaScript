import type { ProjectWorkspace } from "./project-state";
import {
  saveWorkspace,
  type WorkspaceSnapshot,
} from "./persistence";

export type WorkspaceSaveStatus = "saving" | "saved" | "error";

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
  cancel: () => void;
};

export function createWorkspaceAutosave<TimerId>({
  storage,
  delay = 300,
  schedule,
  cancel,
  onStatusChange,
  getNow = () => new Date(),
}: WorkspaceAutosaveOptions<TimerId>): WorkspaceAutosave {
  let pending: { timerId: TimerId; workspace: ProjectWorkspace } | null = null;

  function persist(workspace: ProjectWorkspace) {
    try {
      const snapshot = saveWorkspace(storage, workspace, getNow());
      onStatusChange("saved", snapshot);
    } catch {
      onStatusChange("error");
    }
  }

  function cancelPending() {
    if (!pending) return;

    cancel(pending.timerId);
    pending = null;
  }

  return {
    queue(workspace) {
      cancelPending();
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
      if (!pending) return;

      const { workspace } = pending;
      cancelPending();
      persist(workspace);
    },
    cancel: cancelPending,
  };
}
