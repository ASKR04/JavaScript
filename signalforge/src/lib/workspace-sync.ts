import {
  parseWorkspaceSnapshot,
  type WorkspaceSnapshot,
} from "./persistence";

export function selectNewerWorkspaceSnapshot(
  serialized: string,
  currentSavedAt: string | null,
): WorkspaceSnapshot | null {
  const candidate = parseWorkspaceSnapshot(serialized);
  if (!candidate) return null;
  if (!currentSavedAt) return candidate;

  const currentTime = Date.parse(currentSavedAt);
  if (Number.isNaN(currentTime)) return candidate;

  return Date.parse(candidate.savedAt) > currentTime ? candidate : null;
}
