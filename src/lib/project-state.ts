export type WorkStatus = "planned" | "active" | "blocked" | "complete";

export type Feature = {
  title: string;
  description: string;
  status: WorkStatus;
};

export type RoadmapItem = {
  sequence: string;
  title: string;
  outcome: string;
  status: WorkStatus;
};

export type ArchitectureDecision = {
  id: string;
  title: string;
  context: string;
  impact: string;
};

export type ProjectWorkspace = {
  name: string;
  description: string;
  audience: string;
  value: string;
  nextProofPoint: string;
  features: Feature[];
  roadmap: RoadmapItem[];
  decisions: ArchitectureDecision[];
};

export const projectWorkspace: ProjectWorkspace = {
  name: "SignalForge",
  description:
    "A local-first dashboard that helps developers plan useful projects, track implementation evidence, and turn daily progress into a coherent portfolio narrative.",
  audience:
    "Developers who want their GitHub repositories to show product thinking, architecture judgment, and consistent execution.",
  value:
    "SignalForge keeps project purpose, feature scope, technical decisions, and commit evidence visible in one focused workspace.",
  nextProofPoint:
    "Add editable workspace state with local persistence so users can shape their own project plans.",
  features: [
    {
      title: "Project brief",
      description:
        "Capture the problem, audience, value proposition, and measurable success criteria before implementation begins.",
      status: "active",
    },
    {
      title: "Roadmap workspace",
      description:
        "Break the project into meaningful milestones that produce visible engineering progress.",
      status: "active",
    },
    {
      title: "Commit planner",
      description:
        "Translate implementation work into clear commit messages and proof points for the project history.",
      status: "planned",
    },
    {
      title: "Portfolio summary",
      description:
        "Collect final highlights and technical evidence that can be reused in a README or case study.",
      status: "planned",
    },
  ],
  roadmap: [
    {
      sequence: "01",
      title: "Foundation",
      outcome:
        "Create the app shell, sample workspace data, responsive layout, and initial documentation.",
      status: "active",
    },
    {
      sequence: "02",
      title: "Editable planning",
      outcome:
        "Introduce forms and state transitions for project briefs, features, and milestones.",
      status: "planned",
    },
    {
      sequence: "03",
      title: "Persistence",
      outcome:
        "Save workspace snapshots locally and recover the last planning session on reload.",
      status: "planned",
    },
    {
      sequence: "04",
      title: "Project story export",
      outcome:
        "Generate a clean portfolio summary from the project evidence captured in the app.",
      status: "planned",
    },
  ],
  decisions: [
    {
      id: "ADR-001",
      title: "Start local-first",
      context:
        "The earliest version should be useful without accounts, services, or network configuration.",
      impact:
        "Browser storage keeps the workflow fast while leaving room for a backend adapter later.",
    },
    {
      id: "ADR-002",
      title: "Keep project state typed",
      context:
        "The app will grow from static sample data into editable state, validation, and exports.",
      impact:
        "Typed models make state transitions easier to test and refactor as features expand.",
    },
  ],
};

