import { describe, expect, it } from "vitest";
import { createDefaultWorkspace } from "./project-state";
import { loadWorkspace } from "./persistence";
import { createWorkspaceAutosave } from "./workspace-autosave";
import { updateProjectBrief } from "./workspace-state";

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

function createTimerHarness() {
  const callbacks = new Map<number, () => void>();
  let nextId = 0;

  return {
    callbacks,
    schedule(callback: () => void) {
      nextId += 1;
      callbacks.set(nextId, callback);
      return nextId;
    },
    cancel(timerId: number) {
      callbacks.delete(timerId);
    },
  };
}

describe("workspace autosave", () => {
  it("coalesces rapid edits and saves only the newest workspace", () => {
    const storage = new MemoryStorage();
    const timers = createTimerHarness();
    const statuses: string[] = [];
    const autosave = createWorkspaceAutosave({
      storage,
      schedule: (callback) => timers.schedule(callback),
      cancel: (timerId) => timers.cancel(timerId),
      onStatusChange: (status) => statuses.push(status),
      getNow: () => new Date("2026-08-20T15:00:00.000Z"),
    });
    const firstEdit = updateProjectBrief(createDefaultWorkspace(), {
      name: "First draft",
    });
    const latestEdit = updateProjectBrief(firstEdit, {
      name: "Latest draft",
    });

    autosave.queue(firstEdit);
    autosave.queue(latestEdit);
    expect(timers.callbacks.size).toBe(1);

    [...timers.callbacks.values()][0]();

    expect(loadWorkspace(storage)?.workspace.name).toBe("Latest draft");
    expect(statuses).toEqual(["saving", "saving", "saved"]);
  });

  it("flushes a pending edit immediately for page lifecycle events", () => {
    const storage = new MemoryStorage();
    const timers = createTimerHarness();
    const autosave = createWorkspaceAutosave({
      storage,
      schedule: (callback) => timers.schedule(callback),
      cancel: (timerId) => timers.cancel(timerId),
      onStatusChange: () => undefined,
      getNow: () => new Date("2026-08-20T15:05:00.000Z"),
    });
    const workspace = updateProjectBrief(createDefaultWorkspace(), {
      nextProofPoint: "Verify lifecycle-safe persistence",
    });

    autosave.queue(workspace);
    autosave.flush();

    expect(timers.callbacks.size).toBe(0);
    expect(loadWorkspace(storage)).toEqual({
      workspace,
      savedAt: "2026-08-20T15:05:00.000Z",
    });
  });

  it("retains a failed workspace for an explicit retry", () => {
    const storage = new MemoryStorage();
    const timers = createTimerHarness();
    const statuses: string[] = [];
    let storageIsAvailable = false;
    const autosave = createWorkspaceAutosave({
      storage: {
        setItem: (key, value) => {
          if (storageIsAvailable) {
            storage.setItem(key, value);
            return;
          }
          throw new Error("Storage unavailable");
        },
        removeItem: (key) => storage.removeItem(key),
      },
      schedule: (callback) => timers.schedule(callback),
      cancel: (timerId) => timers.cancel(timerId),
      onStatusChange: (status) => statuses.push(status),
      getNow: () => new Date("2026-08-21T15:00:00.000Z"),
    });
    const workspace = updateProjectBrief(createDefaultWorkspace(), {
      nextProofPoint: "Recover the latest local edit",
    });

    autosave.queue(workspace);
    autosave.flush();
    storageIsAvailable = true;
    autosave.retry();

    expect(loadWorkspace(storage)).toEqual({
      workspace,
      savedAt: "2026-08-21T15:00:00.000Z",
    });
    expect(statuses).toEqual(["saving", "error", "saving", "saved"]);
    expect(timers.callbacks.size).toBe(0);
  });

  it("retries a failed save when a later lifecycle flush runs", () => {
    const storage = new MemoryStorage();
    const timers = createTimerHarness();
    let storageIsAvailable = false;
    const autosave = createWorkspaceAutosave({
      storage: {
        setItem: (key, value) => {
          if (!storageIsAvailable) throw new Error("Storage unavailable");
          storage.setItem(key, value);
        },
        removeItem: (key) => storage.removeItem(key),
      },
      schedule: (callback) => timers.schedule(callback),
      cancel: (timerId) => timers.cancel(timerId),
      onStatusChange: () => undefined,
    });
    const workspace = updateProjectBrief(createDefaultWorkspace(), {
      value: "Keep local work recoverable after a transient failure.",
    });

    autosave.queue(workspace);
    autosave.flush();
    storageIsAvailable = true;
    autosave.flush();

    expect(loadWorkspace(storage)?.workspace).toEqual(workspace);
  });

  it("supersedes a failed workspace when a newer edit is queued", () => {
    const storage = new MemoryStorage();
    const timers = createTimerHarness();
    let storageIsAvailable = false;
    const statuses: string[] = [];
    const autosave = createWorkspaceAutosave({
      storage: {
        setItem: (key, value) => {
          if (!storageIsAvailable) throw new Error("Storage unavailable");
          storage.setItem(key, value);
        },
        removeItem: (key) => storage.removeItem(key),
      },
      schedule: (callback) => timers.schedule(callback),
      cancel: (timerId) => timers.cancel(timerId),
      onStatusChange: (status) => statuses.push(status),
    });
    const firstEdit = updateProjectBrief(createDefaultWorkspace(), {
      name: "Unavailable draft",
    });
    const latestEdit = updateProjectBrief(firstEdit, {
      name: "Recovered latest draft",
    });

    autosave.queue(firstEdit);
    autosave.flush();
    storageIsAvailable = true;
    autosave.queue(latestEdit);
    autosave.flush();
    autosave.retry();

    expect(loadWorkspace(storage)?.workspace.name).toBe(
      "Recovered latest draft",
    );
    expect(statuses).toEqual(["saving", "error", "saving", "saved"]);
  });
});
