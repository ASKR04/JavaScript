export type WorkspacePersistenceStatus =
  | "saving"
  | "saved"
  | "error"
  | "conflict"
  | "recovery"
  | "unavailable";

export function shouldProtectWorkspaceExit(
  status: WorkspacePersistenceStatus,
): boolean {
  return (
    status === "saving" ||
    status === "error" ||
    status === "conflict" ||
    status === "recovery"
  );
}
