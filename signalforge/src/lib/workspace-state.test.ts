import { describe, expect, it } from "vitest";
import { createDefaultWorkspace } from "./project-state";
import {
  clearWorkspace,
  createWorkspaceStorage,
  loadWorkspace,
  readWorkspace,
  saveWorkspace,
} from "./persistence";
import {
  addArchitectureDecision,
  addCommitNarrative,
  addFeature,
  addRoadmapItem,
  removeArchitectureDecision,
  removeCommitNarrative,
  removeFeature,
  removeRoadmapItem,
  updateArchitectureDecision,
  updateFeatureStatus,
  updateProjectBrief,
  updateRoadmapStatus,
  formatCommitBody,
  formatCommitSubject,
} from "./workspace-state";

class MemoryStorage {
  private values = new Map<string, string>();

  getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.values.set(key, value);
  }

  removeItem(key: string): void {
    this.values.delete(key);
  }
}

describe("workspace state", () => {
  it("updates brief fields without mutating the current workspace", () => {
    const workspace = createDefaultWorkspace();
    const updated = updateProjectBrief(workspace, {
      name: "Release Atlas",
      nextProofPoint: "Ship an accessible project importer",
    });

    expect(updated.name).toBe("Release Atlas");
    expect(updated.nextProofPoint).toBe(
      "Ship an accessible project importer",
    );
    expect(workspace.name).toBe("SignalForge");
  });

  it("updates feature and roadmap status by stable id", () => {
    const workspace = createDefaultWorkspace();
    const withFeatureBlocked = updateFeatureStatus(
      workspace,
      "project-brief",
      "blocked",
    );
    const withRoadmapBlocked = updateRoadmapStatus(
      withFeatureBlocked,
      "editable-planning",
      "blocked",
    );

    expect(withRoadmapBlocked.features[0].status).toBe("blocked");
    expect(withRoadmapBlocked.roadmap[1].status).toBe("blocked");
    expect(workspace.features[0].status).toBe("complete");
  });

  it("adds trimmed features and rejects duplicate or incomplete drafts", () => {
    const workspace = createDefaultWorkspace();
    const added = addFeature(
      workspace,
      {
        title: "  Release checklist  ",
        details: "  Track the evidence required before launch.  ",
      },
      "release-checklist",
    );

    expect(added.errors).toEqual({});
    expect(added.workspace.features.at(-1)).toEqual({
      id: "release-checklist",
      title: "Release checklist",
      description: "Track the evidence required before launch.",
      status: "planned",
    });
    expect(workspace.features).toHaveLength(4);

    const invalid = addFeature(workspace, {
      title: "PROJECT BRIEF",
      details: "Too short",
    });
    expect(invalid.workspace).toBe(workspace);
    expect(invalid.errors.title).toContain("not already");
    expect(invalid.errors.details).toContain("12 characters");
  });

  it("adds milestones and resequences the roadmap after removal", () => {
    const workspace = createDefaultWorkspace();
    const added = addRoadmapItem(
      workspace,
      {
        title: "Responsive audit",
        details: "Verify the primary workflows at mobile and desktop sizes.",
      },
      "responsive-audit",
    );

    expect(added.workspace.roadmap.at(-1)?.sequence).toBe("05");

    const withoutSecondItem = removeRoadmapItem(
      added.workspace,
      "editable-planning",
    );
    expect(withoutSecondItem.roadmap.map((item) => item.sequence)).toEqual([
      "01",
      "02",
      "03",
      "04",
    ]);

    const withoutFeature = removeFeature(workspace, "commit-planner");
    expect(withoutFeature.features.map((feature) => feature.id)).not.toContain(
      "commit-planner",
    );
  });

  it("adds a validated architecture decision with a stable sequence", () => {
    const workspace = createDefaultWorkspace();
    const added = addArchitectureDecision(workspace, {
      title: "  Export without a server  ",
      context: "  Project stories should remain available offline.  ",
      impact: "  Generate downloadable content in the browser.  ",
    });

    expect(added.errors).toEqual({});
    expect(added.workspace.decisions.at(-1)).toEqual({
      id: "ADR-003",
      title: "Export without a server",
      context: "Project stories should remain available offline.",
      impact: "Generate downloadable content in the browser.",
    });
    expect(workspace.decisions).toHaveLength(2);

    const invalid = addArchitectureDecision(workspace, {
      title: "START LOCAL-FIRST",
      context: "Too short",
      impact: "Also short",
    });
    expect(invalid.workspace).toBe(workspace);
    expect(invalid.errors.title).toContain("not already");
    expect(invalid.errors.context).toContain("12 characters");
    expect(invalid.errors.impact).toContain("12 characters");
  });

  it("updates and removes architecture decisions immutably", () => {
    const workspace = createDefaultWorkspace();
    const updated = updateArchitectureDecision(workspace, "ADR-002", {
      title: "Keep domain state typed",
      context: "Editable planning adds more state transitions over time.",
      impact: "Pure typed helpers remain independently testable.",
    });

    expect(updated.errors).toEqual({});
    expect(updated.workspace.decisions[1].title).toBe(
      "Keep domain state typed",
    );
    expect(workspace.decisions[1].title).toBe("Keep project state typed");

    const duplicate = updateArchitectureDecision(workspace, "ADR-002", {
      title: "Start local-first",
      context: "This is valid context for the duplicate title check.",
      impact: "This is a valid consequence for the same check.",
    });
    expect(duplicate.workspace).toBe(workspace);
    expect(duplicate.errors.title).toContain("not already");

    const removed = removeArchitectureDecision(
      updated.workspace,
      "ADR-001",
    );
    expect(removed.decisions.map((decision) => decision.id)).toEqual([
      "ADR-002",
    ]);
  });

  it("creates a validated, reusable commit narrative", () => {
    const workspace = createDefaultWorkspace();
    const added = addCommitNarrative(
      workspace,
      {
        date: "2026-08-14",
        kind: "feat",
        scope: "commit-planner",
        summary: "connect work notes to evidence",
        implementation:
          "Added a structured narrative composer and persistent evidence cards.",
        evidence: "Covered validation and generated commit copy with tests.",
      },
      "commit-narrative",
    );

    expect(added.errors).toEqual({});
    expect(added.workspace.commitNarratives[0].id).toBe("commit-narrative");
    expect(formatCommitSubject(added.workspace.commitNarratives[0])).toBe(
      "feat(commit-planner): connect work notes to evidence",
    );
    expect(formatCommitBody(added.workspace.commitNarratives[0])).toContain(
      "Verification:\n- Covered validation",
    );
    expect(workspace.commitNarratives).toHaveLength(1);

    const removed = removeCommitNarrative(
      added.workspace,
      "commit-narrative",
    );
    expect(removed.commitNarratives).toEqual(workspace.commitNarratives);
  });

  it("rejects commit narratives without reviewable evidence", () => {
    const workspace = createDefaultWorkspace();
    const invalid = addCommitNarrative(workspace, {
      date: "2026-02-30",
      kind: "feat",
      scope: "Signal Forge",
      summary: "tiny",
      implementation: "Too vague",
      evidence: "No tests",
    });

    expect(invalid.workspace).toBe(workspace);
    expect(invalid.errors.date).toContain("valid calendar date");
    expect(invalid.errors.scope).toContain("lowercase scope");
    expect(invalid.errors.summary).toContain("8 characters");
    expect(invalid.errors.implementation).toContain("20 characters");
    expect(invalid.errors.evidence).toContain("proof point");
  });
});

describe("workspace persistence", () => {
  it("round-trips a versioned workspace snapshot", () => {
    const storage = new MemoryStorage();
    const workspace = updateProjectBrief(createDefaultWorkspace(), {
      audience: "Product-minded engineers",
    });
    const savedAt = new Date("2026-08-10T15:00:00.000Z");

    saveWorkspace(storage, workspace, savedAt);

    expect(loadWorkspace(storage)).toEqual({
      workspace,
      savedAt: savedAt.toISOString(),
    });
  });

  it("rejects invalid data and clears saved work", () => {
    const storage = new MemoryStorage();
    storage.setItem("signalforge.workspace.v1", "{broken-json");

    expect(loadWorkspace(storage)).toBeNull();
    expect(readWorkspace(storage)).toEqual({
      status: "invalid",
      serialized: "{broken-json",
    });

    saveWorkspace(storage, createDefaultWorkspace());
    clearWorkspace(storage);
    expect(loadWorkspace(storage)).toBeNull();
    expect(readWorkspace(storage)).toEqual({ status: "empty" });
  });

  it("preserves a future-version snapshot for explicit recovery", () => {
    const storage = new MemoryStorage();
    const serialized = JSON.stringify({
      version: 99,
      workspace: createDefaultWorkspace(),
      savedAt: "2026-08-26T15:00:00.000Z",
    });
    storage.setItem("signalforge.workspace.v1", serialized);

    expect(readWorkspace(storage)).toEqual({
      status: "invalid",
      serialized,
    });
  });

  it("distinguishes unavailable storage from an empty workspace", () => {
    expect(
      readWorkspace({
        getItem: () => {
          throw new Error("Storage access denied");
        },
      }),
    ).toEqual({ status: "unavailable" });
  });

  it("contains errors thrown while resolving browser storage", () => {
    const storage = createWorkspaceStorage(() => {
      throw new Error("The browser denied access to localStorage");
    });

    expect(readWorkspace(storage)).toEqual({ status: "unavailable" });
    expect(() => saveWorkspace(storage, createDefaultWorkspace())).toThrow(
      "The browser denied access to localStorage",
    );
  });

  it("re-resolves browser storage so a later access attempt can recover", () => {
    const memoryStorage = new MemoryStorage();
    let storageIsAvailable = false;
    const storage = createWorkspaceStorage(() => {
      if (!storageIsAvailable) throw new Error("Storage access denied");
      return memoryStorage;
    });

    expect(readWorkspace(storage)).toEqual({ status: "unavailable" });

    storageIsAvailable = true;
    saveWorkspace(
      storage,
      createDefaultWorkspace(),
      new Date("2026-08-30T15:00:00.000Z"),
    );

    expect(readWorkspace(storage).status).toBe("ready");
  });

  it("migrates version one snapshots without losing saved planning work", () => {
    const storage = new MemoryStorage();
    const { commitNarratives: _, ...legacyWorkspace } =
      createDefaultWorkspace();
    storage.setItem(
      "signalforge.workspace.v1",
      JSON.stringify({
        version: 1,
        workspace: legacyWorkspace,
        savedAt: "2026-08-13T15:00:00.000Z",
      }),
    );

    const loaded = loadWorkspace(storage);
    expect(loaded?.workspace.name).toBe("SignalForge");
    expect(loaded?.workspace.commitNarratives).toEqual([]);
  });
});
