import { describe, expect, it } from "vitest";
import { createDefaultWorkspace } from "./project-state";
import {
  createProjectStoryFilename,
  createProjectStoryMarkdown,
  getProjectStoryMetrics,
} from "./project-story";

describe("project story export", () => {
  it("creates a portable Markdown story from live workspace evidence", () => {
    const workspace = createDefaultWorkspace();
    const markdown = createProjectStoryMarkdown(
      workspace,
      new Date("2026-08-13T15:00:00.000Z"),
    );

    expect(markdown).toContain("# SignalForge");
    expect(markdown).toContain("## Delivery evidence");
    expect(markdown).toContain("- 3 of 4 features complete");
    expect(markdown).toContain("04. **Project story export**");
    expect(markdown).toContain("## Commit narrative");
    expect(markdown).toContain(
      "### feat(signalforge): add portable project story export",
    );
    expect(markdown).toContain("### ADR-001 · Start local-first");
    expect(markdown).toContain("August 13, 2026");
  });

  it("escapes Markdown control characters and handles empty evidence", () => {
    const workspace = {
      ...createDefaultWorkspace(),
      name: "Plan *Alpha* <launch>",
      features: [],
      roadmap: [],
      decisions: [],
      commitNarratives: [],
    };
    const markdown = createProjectStoryMarkdown(workspace);

    expect(markdown).toContain("# Plan \\*Alpha\\* \\<launch\\>");
    expect(markdown).toContain("No features recorded yet.");
    expect(markdown).toContain("No milestones recorded yet.");
    expect(markdown).toContain("No architecture decisions recorded yet.");
    expect(markdown).toContain("No commit narratives recorded yet.");
  });

  it("derives safe filenames and completion metrics", () => {
    const workspace = createDefaultWorkspace();

    expect(createProjectStoryFilename(" Résumé Builder / 2026 ")).toBe(
      "resume-builder-2026-story.md",
    );
    expect(createProjectStoryFilename("***")).toBe("project-story.md");
    expect(getProjectStoryMetrics(workspace)).toEqual({
      completedFeatures: 3,
      completedMilestones: 3,
      totalFeatures: 4,
      totalMilestones: 4,
      decisionCount: 2,
      commitNarrativeCount: 1,
    });
  });
});
