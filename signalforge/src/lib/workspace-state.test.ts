import { describe, expect, it } from "vitest";
import { createDefaultWorkspace } from "./project-state";
import {
  clearWorkspace,
  loadWorkspace,
  saveWorkspace,
} from "./persistence";
import {
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
