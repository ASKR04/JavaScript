import { useRef, useState, type ChangeEvent } from "react";
import type { ProjectWorkspace } from "../lib/project-state";
import {
  createWorkspaceBackup,
  createWorkspaceBackupFilename,
  parseWorkspaceBackup,
} from "../lib/workspace-backup";

type SaveStatus = "saving" | "saved" | "error";

type TransferFeedback = {
  tone: "success" | "error";
  message: string;
};

const MAX_BACKUP_SIZE_BYTES = 2_000_000;

type WorkspaceToolbarProps = {
  status: SaveStatus;
  savedAt: string | null;
  workspace: ProjectWorkspace;
  onRestore: (workspace: ProjectWorkspace) => void;
  onReset: () => void;
};

function formatSavedAt(savedAt: string | null): string {
  if (!savedAt) return "Waiting for your first change";

  return `Saved ${new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(savedAt))}`;
}

export function WorkspaceToolbar({
  status,
  savedAt,
  workspace,
  onRestore,
  onReset,
}: WorkspaceToolbarProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [transferFeedback, setTransferFeedback] =
    useState<TransferFeedback | null>(null);
  const statusText =
    status === "saving"
      ? "Saving locally…"
      : status === "error"
        ? "Local save failed"
        : formatSavedAt(savedAt);

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
        <p className={`save-status save-status-${status}`} aria-live="polite">
          <span aria-hidden="true" />
          {statusText}
        </p>
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
    </header>
  );
}
