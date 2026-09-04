import { describe, expect, it } from "vitest";
import { createDefaultWorkspace } from "./project-state";
import {
  createWorkspaceBackup,
  createWorkspaceBackupFilename,
  parseWorkspaceBackup,
} from "./workspace-backup";

describe("workspace backups", () => {
  it("round-trips a current workspace with export metadata", () => {
    const workspace = createDefaultWorkspace();
    const exportedAt = new Date("2026-08-15T15:00:00.000Z");

    const result = parseWorkspaceBackup(
      createWorkspaceBackup(workspace, exportedAt),
    );

    expect(result).toEqual({
      ok: true,
      workspace,
      exportedAt: exportedAt.toISOString(),
      migrated: false,
    });
  });

  it("migrates version one backups without discarding planning data", () => {
    const { commitNarratives: _, ...legacyWorkspace } =
      createDefaultWorkspace();
    const result = parseWorkspaceBackup(
      JSON.stringify({
        format: "signalforge.workspace",
        version: 1,
        exportedAt: "2026-08-13T15:00:00.000Z",
        workspace: legacyWorkspace,
      }),
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.migrated).toBe(true);
    expect(result.workspace.name).toBe("SignalForge");
    expect(result.workspace.commitNarratives).toEqual([]);
  });

  it("rejects malformed, unrelated, and future backup formats", () => {
    expect(parseWorkspaceBackup("{broken-json")).toEqual({
      ok: false,
      error: "This file does not contain valid JSON.",
    });
    expect(parseWorkspaceBackup(JSON.stringify({ version: 2 }))).toEqual({
      ok: false,
      error: "Choose a workspace backup created by SignalForge.",
    });
    expect(
      parseWorkspaceBackup(
        JSON.stringify({
          format: "signalforge.workspace",
          version: 99,
        }),
      ),
    ).toEqual({
      ok: false,
      error: "This backup uses a workspace version SignalForge cannot restore.",
    });
  });

  it("rejects a recognized backup with invalid workspace data", () => {
    const backup = JSON.parse(createWorkspaceBackup(createDefaultWorkspace()));
    backup.workspace.features[0].status = "unknown";

    expect(parseWorkspaceBackup(JSON.stringify(backup))).toEqual({
      ok: false,
      error: "This backup is incomplete or contains invalid workspace data.",
    });
  });

  it("rejects blank stable IDs before replacing the current workspace", () => {
    const backup = JSON.parse(createWorkspaceBackup(createDefaultWorkspace()));
    backup.workspace.commitNarratives[0].id = "   ";

    expect(parseWorkspaceBackup(JSON.stringify(backup))).toEqual({
      ok: false,
      error: "This backup is incomplete or contains invalid workspace data.",
    });
  });

  it("rejects backups with normalized or missing export timestamps", () => {
    const backup = JSON.parse(createWorkspaceBackup(createDefaultWorkspace()));
    backup.exportedAt = "2026-02-30T15:00:00.000Z";

    expect(parseWorkspaceBackup(JSON.stringify(backup))).toEqual({
      ok: false,
      error: "This backup is missing a valid export date.",
    });
  });

  it("creates safe, recognizable backup filenames", () => {
    expect(createWorkspaceBackupFilename("SignalForge: R&D / 2026")).toBe(
      "signalforge-r-d-2026-workspace.json",
    );
    expect(createWorkspaceBackupFilename("---")).toBe(
      "project-workspace.json",
    );
  });
});
