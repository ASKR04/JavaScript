import { describe, expect, it } from "vitest";
import { createDefaultWorkspace } from "./project-state";
import {
  clearWorkspace,
  loadWorkspace,
  saveWorkspace,
} from "./persistence";
import {
  addFeature,
  addRoadmapItem,
  removeFeature,
  removeRoadmapItem,
  updateFeatureStatus,
  updateProjectBrief,
  updateRoadmapStatus,
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

    saveWorkspace(storage, createDefaultWorkspace());
    clearWorkspace(storage);
    expect(loadWorkspace(storage)).toBeNull();
  });
});
