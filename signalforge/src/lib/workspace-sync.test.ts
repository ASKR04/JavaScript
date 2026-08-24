import { describe, expect, it } from "vitest";
import { createDefaultWorkspace } from "./project-state";
import {
  saveWorkspace,
  WORKSPACE_STORAGE_KEY,
} from "./persistence";
import { selectNewerWorkspaceSnapshot } from "./workspace-sync";

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

function createSerializedSnapshot(savedAt: string): string {
  const storage = new MemoryStorage();
  saveWorkspace(storage, createDefaultWorkspace(), new Date(savedAt));
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
});
