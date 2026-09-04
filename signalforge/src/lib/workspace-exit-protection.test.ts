import { describe, expect, it } from "vitest";
import {
  shouldProtectWorkspaceExit,
  type WorkspacePersistenceStatus,
} from "./workspace-exit-protection";

describe("workspace exit protection", () => {
  it.each<WorkspacePersistenceStatus>([
    "saving",
    "error",
    "conflict",
    "recovery",
  ])("protects %s workspace state", (status) => {
    expect(shouldProtectWorkspaceExit(status)).toBe(true);
  });

  it.each<WorkspacePersistenceStatus>(["saved", "unavailable"])(
    "allows exit from untouched %s workspace state",
    (status) => {
      expect(shouldProtectWorkspaceExit(status)).toBe(false);
    },
  );
});
