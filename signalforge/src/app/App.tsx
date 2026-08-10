import { Dashboard } from "../features/dashboard/Dashboard";
import { Decisions } from "../features/decisions/Decisions";
import { Roadmap } from "../features/roadmap/Roadmap";
import { Summary } from "../features/summary/Summary";
import { createDefaultWorkspace } from "../lib/project-state";
import {
  clearWorkspace,
  loadWorkspace,
  saveWorkspace,
} from "../lib/persistence";
import {
  updateFeatureStatus,
  updateProjectBrief,
  updateRoadmapStatus,
} from "../lib/workspace-state";

export function App() {
  const [restoredSnapshot] = useState(() => loadWorkspace(window.localStorage));
  const [workspace, setWorkspace] = useState(
    () => restoredSnapshot?.workspace ?? createDefaultWorkspace(),
  );
  const [savedAt, setSavedAt] = useState(restoredSnapshot?.savedAt ?? null);
  const [saveStatus, setSaveStatus] = useState<"saving" | "saved" | "error">(
    "saved",
  );

  useEffect(() => {
    setSaveStatus("saving");
    const saveTimer = window.setTimeout(() => {
      try {
        const snapshot = saveWorkspace(window.localStorage, workspace);
        setSavedAt(snapshot.savedAt);
        setSaveStatus("saved");
      } catch {
        setSaveStatus("error");
      }
    }, 300);

    return () => window.clearTimeout(saveTimer);
  }, [workspace]);

  function resetWorkspace() {
    const shouldReset = window.confirm(
      "Reset your local changes and restore the SignalForge sample workspace?",
    );
    if (!shouldReset) return;

    clearWorkspace(window.localStorage);
    setSavedAt(null);
    setWorkspace(createDefaultWorkspace());
  }

  return (
    <main className="app-shell">
      <aside className="sidebar" aria-label="SignalForge sections">
        <div>
          <p className="eyebrow">SignalForge</p>
          <h1>Build projects with a stronger engineering story.</h1>
        </div>
        <nav className="nav-list" aria-label="Workspace navigation">
          <a href="#dashboard">Dashboard</a>
          <a href="#roadmap">Roadmap</a>
          <a href="#decisions">Decisions</a>
          <a href="#summary">Summary</a>
        </nav>
      </aside>

      <section className="workspace" aria-label="Project workspace">
        <WorkspaceToolbar
          status={saveStatus}
          savedAt={savedAt}
          onReset={resetWorkspace}
        />
        <Dashboard
          workspace={workspace}
          onBriefChange={(patch) =>
            setWorkspace((current) => updateProjectBrief(current, patch))
          }
          onFeatureStatusChange={(featureId, status) =>
            setWorkspace((current) =>
              updateFeatureStatus(current, featureId, status),
            )
          }
        />
        <Roadmap
          items={workspace.roadmap}
          onStatusChange={(roadmapId, status) =>
            setWorkspace((current) =>
              updateRoadmapStatus(current, roadmapId, status),
            )
          }
        />
        <Decisions decisions={workspace.decisions} />
        <Summary workspace={workspace} />
      </section>
    </main>
  );
}
import { useEffect, useState } from "react";
import { WorkspaceToolbar } from "../components/WorkspaceToolbar";
