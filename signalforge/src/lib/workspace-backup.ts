import type { ProjectWorkspace } from "./project-state";
import {
  migrateProjectWorkspace,
  WORKSPACE_SCHEMA_VERSION,
} from "./persistence";

const BACKUP_FORMAT = "signalforge.workspace";

type WorkspaceBackup = {
  format: typeof BACKUP_FORMAT;
  version: number;
  exportedAt: string;
  workspace: ProjectWorkspace;
};

export type WorkspaceRestoreResult =
  | {
      ok: true;
      workspace: ProjectWorkspace;
      exportedAt: string;
      migrated: boolean;
    }
  | { ok: false; error: string };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isIsoTimestamp(value: unknown): value is string {
  if (typeof value !== "string") return false;

  const parsed = new Date(value);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString() === value;
}

function createProjectSlug(projectName: string): string {
  return projectName
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);
}

export function createWorkspaceBackupFilename(projectName: string): string {
  return `${createProjectSlug(projectName) || "project"}-workspace.json`;
}

export function createWorkspaceBackup(
  workspace: ProjectWorkspace,
  exportedAt = new Date(),
): string {
  const backup: WorkspaceBackup = {
    format: BACKUP_FORMAT,
    version: WORKSPACE_SCHEMA_VERSION,
    exportedAt: exportedAt.toISOString(),
    workspace,
  };

  return JSON.stringify(backup, null, 2);
}

export function parseWorkspaceBackup(
  serialized: string,
): WorkspaceRestoreResult {
  let backup: unknown;

  try {
    backup = JSON.parse(serialized);
  } catch {
    return { ok: false, error: "This file does not contain valid JSON." };
  }

  if (!isRecord(backup) || backup.format !== BACKUP_FORMAT) {
    return {
      ok: false,
      error: "Choose a workspace backup created by SignalForge.",
    };
  }

  if (
    typeof backup.version !== "number" ||
    backup.version < 1 ||
    backup.version > WORKSPACE_SCHEMA_VERSION
  ) {
    return {
      ok: false,
      error: "This backup uses a workspace version SignalForge cannot restore.",
    };
  }

  if (!isIsoTimestamp(backup.exportedAt)) {
    return { ok: false, error: "This backup is missing a valid export date." };
  }

  const workspace = migrateProjectWorkspace(
    backup.version,
    backup.workspace,
  );
  if (!workspace) {
    return {
      ok: false,
      error: "This backup is incomplete or contains invalid workspace data.",
    };
  }

  return {
    ok: true,
    workspace,
    exportedAt: backup.exportedAt,
    migrated: backup.version !== WORKSPACE_SCHEMA_VERSION,
  };
}
