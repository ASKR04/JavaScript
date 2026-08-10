type SaveStatus = "saving" | "saved" | "error";

type WorkspaceToolbarProps = {
  status: SaveStatus;
  savedAt: string | null;
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
  onReset,
}: WorkspaceToolbarProps) {
  const statusText =
    status === "saving"
      ? "Saving locally…"
      : status === "error"
        ? "Local save failed"
        : formatSavedAt(savedAt);

  return (
    <header className="workspace-toolbar">
      <div>
        <p className="eyebrow">Private by default</p>
        <p className={`save-status save-status-${status}`} aria-live="polite">
          <span aria-hidden="true" />
          {statusText}
        </p>
      </div>
      <button className="secondary-button" type="button" onClick={onReset}>
        Reset sample workspace
      </button>
    </header>
  );
}
