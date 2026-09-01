import { useRef, useState, type ChangeEvent } from "react";
import type { ProjectWorkspace } from "../lib/project-state";
import type { WorkspaceSnapshot } from "../lib/persistence";
import type { WorkspaceReplacementRecovery } from "../lib/workspace-replacement";
import type {
  WorkspacePersistenceStatus,
} from "../lib/workspace-exit-protection";
import {
  createWorkspaceBackup,
  createWorkspaceBackupFilename,
  parseWorkspaceBackup,
} from "../lib/workspace-backup";
import { summarizeWorkspaceChanges } from "../lib/workspace-sync";

type TransferFeedback = {
  tone: "success" | "error";
  message: string;
};

const MAX_BACKUP_SIZE_BYTES = 2_000_000;

type WorkspaceToolbarProps = {
  status: WorkspacePersistenceStatus;
  savedAt: string | null;
  workspace: ProjectWorkspace;
  externalSnapshot: WorkspaceSnapshot | null;
  unreadableWorkspace: string | null;
  replacementRecovery: WorkspaceReplacementRecovery | null;
  onLoadExternalChange: () => void;
  onKeepCurrent: () => void;
  onRestore: (workspace: ProjectWorkspace) => void;
  onRetrySave: () => void;
  onReplaceUnreadableWorkspace: () => void;
  onReset: () => void;
  onToggleReplacement: () => void;
};

function formatSaveTime(savedAt: string): string {
  return new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(savedAt));
}

function formatSavedAt(savedAt: string | null): string {
  return savedAt
    ? `Saved ${formatSaveTime(savedAt)}`
    : "Waiting for your first change";
}

export function WorkspaceToolbar({
  status,
  savedAt,
  workspace,
  externalSnapshot,
  unreadableWorkspace,
  replacementRecovery,
  onLoadExternalChange,
  onKeepCurrent,
  onRestore,
  onRetrySave,
  onReplaceUnreadableWorkspace,
  onReset,
  onToggleReplacement,
}: WorkspaceToolbarProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [transferFeedback, setTransferFeedback] =
    useState<TransferFeedback | null>(null);
  const externalChanges = externalSnapshot
    ? summarizeWorkspaceChanges(workspace, externalSnapshot.workspace)
    : [];
  const statusText =
    status === "saving"
      ? "Saving locally…"
      : status === "error"
        ? "Local save failed; retry before closing"
        : status === "unavailable"
          ? "Browser storage unavailable; work is temporary"
          : status === "conflict"
            ? "Local save paused for a tab conflict"
            : status === "recovery"
              ? "Autosave paused to protect unreadable saved data"
              : formatSavedAt(savedAt);
  const replacementAction = replacementRecovery
    ? `${replacementRecovery.direction === "undo" ? "Undo" : "Redo"} ${replacementRecovery.operation}`
    : null;

  function downloadBackup() {
    const contents = createWorkspaceBackup(workspace);
    const url = URL.createObjectURL(
      new Blob([contents], { type: "application/json" }),
    );
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = createWorkspaceBackupFilename(workspace.name);
    anchor.click();
    URL.revokeObjectURL(url);
    setTransferFeedback({
      tone: "success",
      message: "Workspace backup downloaded.",
    });
  }

  function downloadUnreadableWorkspace() {
    if (unreadableWorkspace === null) return;

    const url = URL.createObjectURL(
      new Blob([unreadableWorkspace], { type: "text/plain" }),
    );
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "signalforge-unreadable-workspace.txt";
    anchor.click();
    URL.revokeObjectURL(url);
    setTransferFeedback({
      tone: "success",
      message: "Unreadable local data downloaded for recovery.",
    });
  }

  function replaceUnreadableWorkspace() {
    const shouldReplace = window.confirm(
      "Replace the unreadable saved data with the workspace currently shown? Download the raw data first if you may need it.",
    );
    if (shouldReplace) onReplaceUnreadableWorkspace();
  }

  async function restoreBackup(event: ChangeEvent<HTMLInputElement>) {
    const input = event.currentTarget;
    const file = input.files?.[0];
    if (!file) return;

    if (file.size > MAX_BACKUP_SIZE_BYTES) {
      setTransferFeedback({
        tone: "error",
        message: "Choose a workspace backup smaller than 2 MB.",
      });
      input.value = "";
      return;
    }

    try {
      const result = parseWorkspaceBackup(await file.text());
      if (!result.ok) {
        setTransferFeedback({ tone: "error", message: result.error });
        return;
      }

      const shouldRestore = window.confirm(
        `Replace the current workspace with the validated backup from ${file.name}?`,
      );
      if (!shouldRestore) return;

      onRestore(result.workspace);
      setTransferFeedback({
        tone: "success",
        message: result.migrated
          ? "Older backup migrated and restored."
          : "Workspace backup restored.",
      });
    } catch {
      setTransferFeedback({
        tone: "error",
        message: "SignalForge could not read this backup file.",
      });
    } finally {
      input.value = "";
    }
  }

  return (
    <header className="workspace-toolbar">
      <div>
        <p className="eyebrow">Private by default</p>
        <div className="save-status-row">
          <p className={`save-status save-status-${status}`} aria-live="polite">
            <span aria-hidden="true" />
            {statusText}
          </p>
          {status === "error" || status === "unavailable" ? (
            <button
              className="text-button save-retry-button"
              type="button"
              onClick={onRetrySave}
            >
              {status === "unavailable" ? "Try local save" : "Retry save"}
            </button>
          ) : null}
        </div>
      </div>
      <div className="workspace-transfer">
        <div className="workspace-toolbar-actions">
          <button
            className="secondary-button"
            type="button"
            onClick={downloadBackup}
          >
            Download backup
          </button>
          <button
            className="secondary-button"
            type="button"
            onClick={() => fileInputRef.current?.click()}
          >
            Restore backup
          </button>
          <button
            className="secondary-button danger-button"
            type="button"
            onClick={onReset}
          >
            Reset sample
          </button>
        </div>
        <input
          ref={fileInputRef}
          className="visually-hidden"
          type="file"
          accept=".json,application/json"
          onChange={restoreBackup}
          aria-label="Choose a SignalForge workspace backup"
        />
        {transferFeedback ? (
          <p
            className={`transfer-feedback transfer-feedback-${transferFeedback.tone}`}
            role="status"
          >
            {transferFeedback.message}
          </p>
        ) : null}
      </div>
      {status === "unavailable" ? (
        <div className="storage-unavailable-notice" role="alert">
          <div>
            <strong>This workspace is open only in this tab.</strong>
            <p>
              SignalForge could not access browser storage. Try local save to
              check again, or download a backup before closing if storage stays
              unavailable.
            </p>
          </div>
        </div>
      ) : null}
      {externalSnapshot ? (
        <div className="external-change-notice" role="alert">
          <div>
            <strong>Different changes were saved in another tab.</strong>
            <p>
              The other tab recorded a save at{" "}
              {formatSaveTime(externalSnapshot.savedAt)}. Choose which
              workspace to keep. Edits made while this notice is open stay in
              this tab and remain paused until you choose.
            </p>
            {externalChanges.length > 0 ? (
              <ul
                className="external-change-summary"
                aria-label="Changed workspace sections"
              >
                {externalChanges.map((change) => (
                  <li key={change.key}>
                    <strong>{change.label}:</strong> {change.detail}
                  </li>
                ))}
              </ul>
            ) : (
              <p>The workspaces now have the same content.</p>
            )}
          </div>
          <div className="external-change-actions">
            <button
              className="primary-button"
              type="button"
              onClick={onLoadExternalChange}
            >
              Load other tab
            </button>
            <button
              className="secondary-button"
              type="button"
              onClick={onKeepCurrent}
            >
              Keep this tab
            </button>
          </div>
        </div>
      ) : null}
      {unreadableWorkspace !== null ? (
        <div className="startup-recovery-notice" role="alert">
          <div>
            <strong>Your saved workspace could not be opened.</strong>
            <p>
              SignalForge left the original browser data untouched and paused
              autosave. Download it for recovery, restore a valid backup, or
              explicitly replace it with the workspace currently shown.
            </p>
          </div>
          <div className="startup-recovery-actions">
            <button
              className="secondary-button"
              type="button"
              onClick={downloadUnreadableWorkspace}
            >
              Download raw data
            </button>
            <button
              className="primary-button"
              type="button"
              onClick={replaceUnreadableWorkspace}
            >
              Replace saved data
            </button>
          </div>
        </div>
      ) : null}
      {replacementRecovery && replacementAction ? (
        <div className="workspace-recovery-notice">
          <div role="status">
            <strong>
              {replacementRecovery.operation === "sample reset"
                ? "Sample workspace replacement"
                : "Backup workspace replacement"}{" "}
              {replacementRecovery.direction === "undo"
                ? "completed."
                : "undone."}
            </strong>
            <p>
              This reversible history stays available until another replacement
              or page refresh.
            </p>
          </div>
          <button
            className="secondary-button"
            type="button"
            onClick={onToggleReplacement}
          >
            {replacementAction}
          </button>
        </div>
      ) : null}
    </header>
  );
}
