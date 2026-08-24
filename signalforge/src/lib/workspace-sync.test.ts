import { describe, expect, it } from "vitest";
import {
  createDefaultWorkspace,
  type ProjectWorkspace,
} from "./project-state";
import {
  saveWorkspace,
  WORKSPACE_STORAGE_KEY,
} from "./persistence";
import {
  classifyExternalWorkspaceUpdate,
  selectNewerWorkspaceSnapshot,
  summarizeWorkspaceChanges,
} from "./workspace-sync";

class MemoryStorage {
  private values = new Map<string, string>();

  getItem(key: string) {
    return this.values.get(key) ?? null;
  }

  setItem(key: string, value: string) {
    this.values.set(key, value);
  }

  removeItem(key: string) {
    this.values.delete(key);
  }
}

function createSerializedSnapshot(
  savedAt: string,
  workspace: ProjectWorkspace = createDefaultWorkspace(),
): string {
  const storage = new MemoryStorage();
  saveWorkspace(storage, workspace, new Date(savedAt));
  return storage.getItem(WORKSPACE_STORAGE_KEY) ?? "";
}

describe("workspace tab synchronization", () => {
  it("selects a valid external snapshot when it is newer", () => {
    const selected = selectNewerWorkspaceSnapshot(
      createSerializedSnapshot("2026-08-24T15:05:00.000Z"),
      "2026-08-24T15:00:00.000Z",
    );

    expect(selected?.savedAt).toBe("2026-08-24T15:05:00.000Z");
  });

  it("ignores stale and duplicate external snapshots", () => {
    const serialized = createSerializedSnapshot("2026-08-24T15:00:00.000Z");

    expect(
      selectNewerWorkspaceSnapshot(serialized, "2026-08-24T15:01:00.000Z"),
    ).toBeNull();
    expect(
      selectNewerWorkspaceSnapshot(serialized, "2026-08-24T15:00:00.000Z"),
    ).toBeNull();
  });

  it("rejects malformed snapshots before they reach the interface", () => {
    expect(
      selectNewerWorkspaceSnapshot("{not-json", null),
    ).toBeNull();
    expect(
      selectNewerWorkspaceSnapshot(
        JSON.stringify({ version: 99, savedAt: "not-a-date", workspace: {} }),
        null,
      ),
    ).toBeNull();
    expect(
      selectNewerWorkspaceSnapshot(
        JSON.stringify({
          version: 2,
          savedAt: "not-a-date",
          workspace: createDefaultWorkspace(),
        }),
        null,
      ),
    ).toBeNull();
  });

  it("silently reconciles newer snapshots with identical content", () => {
    const current = createDefaultWorkspace();
    const firstFeature = current.features[0];
    const reorderedWorkspace = {
      ...current,
      features: [
        {
          status: firstFeature.status,
          description: firstFeature.description,
          title: firstFeature.title,
          id: firstFeature.id,
        },
        ...current.features.slice(1),
      ],
    };
    const update = classifyExternalWorkspaceUpdate(
      createSerializedSnapshot(
        "2026-08-24T15:05:00.000Z",
        reorderedWorkspace,
      ),
      current,
      "2026-08-24T15:00:00.000Z",
    );

    expect(update).toMatchObject({
      kind: "identical",
      snapshot: { savedAt: "2026-08-24T15:05:00.000Z" },
    });
  });

  it("classifies changed newer snapshots as conflicts", () => {
    const current = createDefaultWorkspace();
    const incoming = {
      ...current,
      nextProofPoint: "Review the incoming tab before replacing local work.",
    };
    const update = classifyExternalWorkspaceUpdate(
      createSerializedSnapshot("2026-08-24T15:05:00.000Z", incoming),
      current,
      "2026-08-24T15:00:00.000Z",
    );

    expect(update).toMatchObject({
      kind: "conflict",
      snapshot: { workspace: incoming },
    });
  });

  it("summarizes changed sections without exposing workspace contents", () => {
    const current = createDefaultWorkspace();
    const incoming = {
      ...current,
      name: "SignalForge review",
      audience: "Developers reviewing local-first workflows.",
      features: [
        { ...current.features[0], status: "active" as const },
        ...current.features.slice(1),
        {
          id: "conflict-preview",
          title: "Conflict preview",
          description: "Summarize incoming workspace changes.",
          status: "planned" as const,
        },
      ],
      roadmap: current.roadmap.slice(0, -1),
      decisions: [
        { ...current.decisions[0], impact: "Make tab decisions informed." },
        ...current.decisions.slice(1),
      ],
      commitNarratives: [
        ...current.commitNarratives,
        {
          id: "conflict-review",
          date: "2026-08-24",
          kind: "fix" as const,
          scope: "signalforge",
          summary: "explain incoming tab changes",
          implementation: "Added a section-level conflict summary.",
          evidence: "Covered by synchronization tests.",
        },
      ],
    };

    expect(summarizeWorkspaceChanges(current, incoming)).toEqual([
      {
        key: "brief",
        label: "Project brief",
        detail: "2 changed fields",
      },
      {
        key: "features",
        label: "Features",
        detail: "1 added item, 1 updated item",
      },
      {
        key: "roadmap",
        label: "Roadmap",
        detail: "1 removed item",
      },
      {
        key: "decisions",
        label: "Architecture decisions",
        detail: "1 updated item",
      },
      {
        key: "commits",
        label: "Commit narratives",
        detail: "1 added item",
      },
    ]);
  });
});
