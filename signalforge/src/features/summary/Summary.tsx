import { useState } from "react";
import type { ProjectWorkspace } from "../../lib/project-state";
import {
  createProjectStoryFilename,
  createProjectStoryMarkdown,
  getProjectStoryMetrics,
} from "../../lib/project-story";

type SummaryProps = {
  workspace: ProjectWorkspace;
};

export function Summary({ workspace }: SummaryProps) {
  const [exportStatus, setExportStatus] = useState<
    "idle" | "downloaded" | "copied" | "error"
  >("idle");
  const metrics = getProjectStoryMetrics(workspace);

  function downloadProjectStory() {
    const markdown = createProjectStoryMarkdown(workspace);
    const blobUrl = URL.createObjectURL(
      new Blob([markdown], { type: "text/markdown;charset=utf-8" }),
    );
    const link = document.createElement("a");
    link.href = blobUrl;
    link.download = createProjectStoryFilename(workspace.name);
    document.body.append(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(blobUrl), 0);
    setExportStatus("downloaded");
  }

  async function copyProjectStory() {
    try {
      await navigator.clipboard.writeText(createProjectStoryMarkdown(workspace));
      setExportStatus("copied");
    } catch {
      setExportStatus("error");
    }
  }

  const statusMessage =
    exportStatus === "downloaded"
      ? "Markdown project story downloaded."
      : exportStatus === "copied"
        ? "Markdown copied to your clipboard."
        : exportStatus === "error"
          ? "Clipboard access failed. Download the Markdown file instead."
          : "Export includes the current brief, delivery status, roadmap, and decisions.";

  return (
    <section className="panel summary-panel" id="summary">
      <div className="section-heading">
        <p className="eyebrow">Portfolio Summary</p>
        <h2>Reusable proof for the final project story</h2>
      </div>

      <dl className="summary-list">
        <div>
          <dt>Audience</dt>
          <dd>{workspace.audience}</dd>
        </div>
        <div>
          <dt>Value</dt>
          <dd>{workspace.value}</dd>
        </div>
        <div>
          <dt>Next proof point</dt>
          <dd>{workspace.nextProofPoint}</dd>
        </div>
      </dl>

      <div className="story-export" aria-labelledby="story-export-title">
        <div className="story-export-copy">
          <p className="eyebrow">Portable evidence</p>
          <h3 id="story-export-title">
            Turn this workspace into a project story
          </h3>
          <p>
            Create a polished Markdown case study for a repository README,
            portfolio page, or review handoff. Everything stays in your browser.
          </p>
        </div>

        <dl className="story-metrics" aria-label="Project story evidence">
          <div>
            <dt>{metrics.completedFeatures}/{metrics.totalFeatures}</dt>
            <dd>features complete</dd>
          </div>
          <div>
            <dt>{metrics.completedMilestones}/{metrics.totalMilestones}</dt>
            <dd>milestones complete</dd>
          </div>
          <div>
            <dt>{metrics.decisionCount}</dt>
            <dd>decisions captured</dd>
          </div>
          <div>
            <dt>{metrics.commitNarrativeCount}</dt>
            <dd>commits evidenced</dd>
          </div>
        </dl>

        <div className="story-export-actions">
          <button
            className="primary-button"
            type="button"
            onClick={downloadProjectStory}
          >
            Download Markdown
          </button>
          <button
            className="secondary-button"
            type="button"
            onClick={copyProjectStory}
          >
            Copy to clipboard
          </button>
        </div>
        <p
          className={`export-feedback${
            exportStatus === "error" ? " export-feedback-error" : ""
          }`}
          aria-live="polite"
        >
          {statusMessage}
        </p>
      </div>
    </section>
  );
}
