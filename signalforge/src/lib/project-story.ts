import type {
  ProjectWorkspace,
  WorkStatus,
} from "./project-state";

export type ProjectStoryMetrics = {
  completedFeatures: number;
  completedMilestones: number;
  totalFeatures: number;
  totalMilestones: number;
  decisionCount: number;
};

function escapeInlineMarkdown(value: string): string {
  return value
    .replace(/([\\`*_{}[\]<>#!|])/g, "\\$1")
    .replace(/\s+/g, " ")
    .trim();
}

function formatStatus(status: WorkStatus): string {
  return status.charAt(0).toUpperCase() + status.slice(1);
}

function formatExportDate(date: Date): string {
  return new Intl.DateTimeFormat("en", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  }).format(date);
}

export function getProjectStoryMetrics(
  workspace: ProjectWorkspace,
): ProjectStoryMetrics {
  return {
    completedFeatures: workspace.features.filter(
      (feature) => feature.status === "complete",
    ).length,
    completedMilestones: workspace.roadmap.filter(
      (item) => item.status === "complete",
    ).length,
    totalFeatures: workspace.features.length,
    totalMilestones: workspace.roadmap.length,
    decisionCount: workspace.decisions.length,
  };
}

export function createProjectStoryFilename(projectName: string): string {
  const slug = projectName
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);

  return `${slug || "project"}-story.md`;
}

export function createProjectStoryMarkdown(
  workspace: ProjectWorkspace,
  generatedAt = new Date(),
): string {
  const metrics = getProjectStoryMetrics(workspace);
  const featureLines = workspace.features.map(
    (feature) =>
      `- ${feature.status === "complete" ? "[x]" : "[ ]"} **${escapeInlineMarkdown(feature.title)}** — ${escapeInlineMarkdown(feature.description)} _(${formatStatus(feature.status)})_`,
  );
  const roadmapLines = workspace.roadmap.map(
    (item) =>
      `${item.sequence}. **${escapeInlineMarkdown(item.title)}** — ${escapeInlineMarkdown(item.outcome)} _(${formatStatus(item.status)})_`,
  );
  const decisionSections = workspace.decisions.flatMap((decision) => [
    `### ${escapeInlineMarkdown(decision.id)} · ${escapeInlineMarkdown(decision.title)}`,
    "",
    `**Context:** ${escapeInlineMarkdown(decision.context)}`,
    "",
    `**Consequence:** ${escapeInlineMarkdown(decision.impact)}`,
    "",
  ]);

  return [
    `# ${escapeInlineMarkdown(workspace.name)}`,
    "",
    escapeInlineMarkdown(workspace.description),
    "",
    "## Product snapshot",
    "",
    `- **Target audience:** ${escapeInlineMarkdown(workspace.audience)}`,
    `- **Value proposition:** ${escapeInlineMarkdown(workspace.value)}`,
    `- **Next proof point:** ${escapeInlineMarkdown(workspace.nextProofPoint)}`,
    "",
    "## Delivery evidence",
    "",
    `- ${metrics.completedFeatures} of ${metrics.totalFeatures} features complete`,
    `- ${metrics.completedMilestones} of ${metrics.totalMilestones} milestones complete`,
    `- ${metrics.decisionCount} architecture decisions documented`,
    "",
    "## Feature scope",
    "",
    ...(featureLines.length > 0 ? featureLines : ["No features recorded yet."]),
    "",
    "## Roadmap",
    "",
    ...(roadmapLines.length > 0 ? roadmapLines : ["No milestones recorded yet."]),
    "",
    "## Architecture decisions",
    "",
    ...(decisionSections.length > 0
      ? decisionSections
      : ["No architecture decisions recorded yet.", ""]),
    "## Portfolio highlights",
    "",
    `- Built for ${escapeInlineMarkdown(workspace.audience)}`,
    `- Delivered ${metrics.completedFeatures} completed features across ${metrics.totalMilestones} planned milestones`,
    `- Preserved engineering rationale in ${metrics.decisionCount} architecture decision records`,
    "",
    `> Generated from live workspace evidence with SignalForge on ${formatExportDate(generatedAt)}.`,
    "",
  ].join("\n");
}
