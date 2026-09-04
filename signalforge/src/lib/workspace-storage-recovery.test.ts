import { describe, expect, it } from "vitest";
import { createDefaultWorkspace } from "./project-state";
import type { WorkspaceLoadResult } from "./persistence";
import { planWorkspaceStorageRecovery } from "./workspace-storage-recovery";

describe("workspace storage recovery", () => {
  it("saves the current workspace only after confirming storage is empty", () => {
    expect(
      planWorkspaceStorageRecovery(
        { status: "empty" },
        createDefaultWorkspace(),
      ),
    ).toEqual({ kind: "save-current" });
  });

  it("keeps temporary work in memory while storage remains unavailable", () => {
    expect(
      planWorkspaceStorageRecovery(
        { status: "unavailable" },
        createDefaultWorkspace(),
      ),
    ).toEqual({ kind: "still-unavailable" });
  });

  it("protects unreadable data instead of replacing it", () => {
    const serialized = "{unreadable";

    expect(
      planWorkspaceStorageRecovery(
        { status: "invalid", serialized },
        createDefaultWorkspace(),
      ),
    ).toEqual({ kind: "protect-unreadable", serialized });
  });

  it("reconciles an existing workspace when its content is identical", () => {
    const workspace = createDefaultWorkspace();
    const snapshot = {
      workspace: structuredClone(workspace),
      savedAt: "2026-09-03T15:00:00.000Z",
    };

    expect(
      planWorkspaceStorageRecovery(
        { status: "ready", snapshot },
        workspace,
      ),
    ).toEqual({ kind: "reconcile", snapshot });
  });

  it("surfaces existing different data as a conflict before any write", () => {
    const currentWorkspace = createDefaultWorkspace();
    const snapshot = {
      workspace: {
        ...createDefaultWorkspace(),
        name: "Existing durable workspace",
      },
      savedAt: "2026-09-03T14:55:00.000Z",
    };
    const loadResult: WorkspaceLoadResult = { status: "ready", snapshot };

    expect(
      planWorkspaceStorageRecovery(loadResult, currentWorkspace),
    ).toEqual({ kind: "conflict", snapshot });
  });
});
