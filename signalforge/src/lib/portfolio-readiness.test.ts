import { describe, expect, it } from "vitest";
import { createDefaultWorkspace } from "./project-state";
import { getPortfolioReadiness } from "./portfolio-readiness";

describe("getPortfolioReadiness", () => {
  it("reports the incomplete areas in the sample workspace", () => {
    const readiness = getPortfolioReadiness(createDefaultWorkspace());

    expect(readiness).toMatchObject({
      completed: 3,
      total: 5,
      percent: 60,
      ready: false,
    });
    expect(
      readiness.items
        .filter((item) => !item.complete)
        .map((item) => item.id),
    ).toEqual(["features", "roadmap"]);
  });

  it("marks a fully evidenced workspace as ready", () => {
    const workspace = createDefaultWorkspace();
    workspace.features = workspace.features.map((feature) => ({
      ...feature,
      status: "complete",
    }));
    workspace.roadmap = workspace.roadmap.map((item) => ({
      ...item,
      status: "complete",
    }));

    expect(getPortfolioReadiness(workspace)).toMatchObject({
      completed: 5,
      total: 5,
      percent: 100,
      ready: true,
    });
  });

  it("requires meaningful content instead of empty records", () => {
    const workspace = createDefaultWorkspace();
    workspace.audience = "   ";
    workspace.decisions[0] = { ...workspace.decisions[0], impact: "" };
    workspace.commitNarratives[0] = {
      ...workspace.commitNarratives[0],
      evidence: " ",
    };

    const readiness = getPortfolioReadiness(workspace);
    const incompleteIds = readiness.items
      .filter((item) => !item.complete)
      .map((item) => item.id);

    expect(incompleteIds).toEqual([
      "brief",
      "features",
      "roadmap",
      "decisions",
      "commits",
    ]);
  });

  it("does not treat empty feature or roadmap collections as complete", () => {
    const workspace = createDefaultWorkspace();
    workspace.features = [];
    workspace.roadmap = [];

    const readiness = getPortfolioReadiness(workspace);

    expect(readiness.items.find((item) => item.id === "features")?.complete).toBe(
      false,
    );
    expect(readiness.items.find((item) => item.id === "roadmap")?.complete).toBe(
      false,
    );
  });
});
