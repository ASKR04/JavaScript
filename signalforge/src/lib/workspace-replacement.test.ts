import { describe, expect, it } from "vitest";
import { createDefaultWorkspace } from "./project-state";
import {
  beginWorkspaceReplacement,
  swapWorkspaceReplacement,
} from "./workspace-replacement";

describe("workspace replacement recovery", () => {
  it("keeps the replaced workspace available for undo", () => {
    const current = createDefaultWorkspace();
    const recovery = beginWorkspaceReplacement(current, "sample reset");

    expect(recovery).toEqual({
      workspace: current,
      operation: "sample reset",
      direction: "undo",
    });
  });

  it("swaps workspaces and makes the replacement redoable", () => {
    const previous = createDefaultWorkspace();
    const replacement = { ...previous, name: "Restored workspace" };
    const result = swapWorkspaceReplacement(
      replacement,
      beginWorkspaceReplacement(previous, "backup restore"),
    );

    expect(result.workspace).toBe(previous);
    expect(result.recovery).toEqual({
      workspace: replacement,
      operation: "backup restore",
      direction: "redo",
    });
  });

  it("can toggle repeatedly without losing either workspace", () => {
    const previous = createDefaultWorkspace();
    const replacement = { ...previous, name: "Sample workspace" };
    const undone = swapWorkspaceReplacement(
      replacement,
      beginWorkspaceReplacement(previous, "sample reset"),
    );
    const redone = swapWorkspaceReplacement(undone.workspace, undone.recovery);

    expect(redone.workspace).toBe(replacement);
    expect(redone.recovery.workspace).toBe(previous);
    expect(redone.recovery.direction).toBe("undo");
  });
});
