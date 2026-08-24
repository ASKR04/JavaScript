import { useEffect, useRef, useState } from "react";
import { WorkspaceToolbar } from "../components/WorkspaceToolbar";
import { CommitPlanner } from "../features/commits/CommitPlanner";
import { Dashboard } from "../features/dashboard/Dashboard";
import { Decisions } from "../features/decisions/Decisions";
import { Roadmap } from "../features/roadmap/Roadmap";
import { Summary } from "../features/summary/Summary";
import { createDefaultWorkspace } from "../lib/project-state";
import {
  clearWorkspace,
  loadWorkspace,
  WORKSPACE_STORAGE_KEY,
  type WorkspaceSnapshot,
} from "../lib/persistence";
import { createWorkspaceAutosave } from "../lib/workspace-autosave";
import { classifyExternalWorkspaceUpdate } from "../lib/workspace-sync";
import {
  addArchitectureDecision,
  addCommitNarrative,
  addFeature,
  addRoadmapItem,
  removeArchitectureDecision,
  removeCommitNarrative,
  removeFeature,
  removeRoadmapItem,
  updateArchitectureDecision,
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
  const [externalSnapshot, setExternalSnapshot] =
    useState<WorkspaceSnapshot | null>(null);
  const [saveStatus, setSaveStatus] = useState<
    "saving" | "saved" | "error" | "conflict"
  >("saved");
  const lastAutosaveWorkspace = useRef(workspace);
  const [autosave] = useState(() =>
    createWorkspaceAutosave({
      storage: window.localStorage,
      schedule: (callback, delay) => window.setTimeout(callback, delay),
      cancel: (timerId) => window.clearTimeout(timerId),
      onStatusChange: (status, snapshot) => {
        setSaveStatus(status);
        if (snapshot) setSavedAt(snapshot.savedAt);
      },
    }),
  );

  useEffect(() => {
    if (lastAutosaveWorkspace.current === workspace) return;

    lastAutosaveWorkspace.current = workspace;
    autosave.queue(workspace);
  }, [autosave, workspace]);

  useEffect(() => {
    const flushPendingSave = () => autosave.flush();
    window.addEventListener("pagehide", flushPendingSave);

    return () => {
      window.removeEventListener("pagehide", flushPendingSave);
      autosave.cancel();
    };
  }, [autosave]);

  useEffect(() => {
    function detectExternalSave(event: StorageEvent) {
      if (event.key !== WORKSPACE_STORAGE_KEY || !event.newValue) return;

      const update = classifyExternalWorkspaceUpdate(
        event.newValue,
        workspace,
        savedAt,
      );
      if (!update) return;

      if (update.kind === "identical") {
        autosave.cancel();
        lastAutosaveWorkspace.current = workspace;
        setSavedAt(update.snapshot.savedAt);
        setSaveStatus("saved");
        setExternalSnapshot(null);
        return;
      }

      autosave.cancel();
      setSaveStatus("conflict");
      setExternalSnapshot((current) =>
        !current || update.snapshot.savedAt > current.savedAt
          ? update.snapshot
          : current,
      );
    }

    window.addEventListener("storage", detectExternalSave);
    return () => window.removeEventListener("storage", detectExternalSave);
  }, [autosave, savedAt, workspace]);

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
      <a className="skip-link" href="#workspace">
        Skip to project workspace
      </a>
      <aside className="sidebar" aria-label="SignalForge sections">
        <div>
          <p className="eyebrow">SignalForge</p>
          <h1>Build projects with a stronger engineering story.</h1>
        </div>
        <nav className="nav-list" aria-label="Workspace navigation">
          <a href="#dashboard">Dashboard</a>
          <a href="#roadmap">Roadmap</a>
          <a href="#decisions">Decisions</a>
          <a href="#commits">Commits</a>
          <a href="#summary">Summary</a>
        </nav>
      </aside>

      <section
        className="workspace"
        id="workspace"
        tabIndex={-1}
        aria-label="Project workspace"
      >
        <WorkspaceToolbar
          status={saveStatus}
          savedAt={savedAt}
          workspace={workspace}
          externalSnapshot={externalSnapshot}
          onLoadExternalChange={() => {
            if (!externalSnapshot) return;

            autosave.cancel();
            lastAutosaveWorkspace.current = externalSnapshot.workspace;
            setSaveStatus("saved");
            setSavedAt(externalSnapshot.savedAt);
            setWorkspace(externalSnapshot.workspace);
            setExternalSnapshot(null);
          }}
          onKeepCurrent={() => {
            setExternalSnapshot(null);
            autosave.queue(workspace);
          }}
          onRestore={(restoredWorkspace) => {
            setSavedAt(null);
            setWorkspace(restoredWorkspace);
          }}
          onRetrySave={() => autosave.retry()}
          onReset={resetWorkspace}
        />
        <Dashboard
          workspace={workspace}
          onFeatureCreate={(draft) => {
            const result = addFeature(workspace, draft);
            if (Object.keys(result.errors).length === 0) {
              setWorkspace(result.workspace);
            }
            return result.errors;
          }}
          onFeatureRemove={(featureId) => {
            const feature = workspace.features.find(
              (item) => item.id === featureId,
            );
            if (
              feature &&
              window.confirm(
                `Remove the feature "${feature.title}" from this workspace?`,
              )
            ) {
              setWorkspace((current) => removeFeature(current, featureId));
            }
          }}
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
          onCreate={(draft) => {
            const result = addRoadmapItem(workspace, draft);
            if (Object.keys(result.errors).length === 0) {
              setWorkspace(result.workspace);
            }
            return result.errors;
          }}
          onRemove={(roadmapId) => {
            const milestone = workspace.roadmap.find(
              (item) => item.id === roadmapId,
            );
            if (
              milestone &&
              window.confirm(`Remove the milestone "${milestone.title}"?`)
            ) {
              setWorkspace((current) => removeRoadmapItem(current, roadmapId));
            }
          }}
          onStatusChange={(roadmapId, status) =>
            setWorkspace((current) =>
              updateRoadmapStatus(current, roadmapId, status),
            )
          }
        />
        <Decisions
          decisions={workspace.decisions}
          onCreate={(draft) => {
            const result = addArchitectureDecision(workspace, draft);
            if (Object.keys(result.errors).length === 0) {
              setWorkspace(result.workspace);
            }
            return result.errors;
          }}
          onRemove={(decisionId) => {
            const decision = workspace.decisions.find(
              (item) => item.id === decisionId,
            );
            if (
              decision &&
              window.confirm(`Remove architecture decision ${decision.id}?`)
            ) {
              setWorkspace((current) =>
                removeArchitectureDecision(current, decisionId),
              );
            }
          }}
          onUpdate={(decisionId, draft) => {
            const result = updateArchitectureDecision(
              workspace,
              decisionId,
              draft,
            );
            if (Object.keys(result.errors).length === 0) {
              setWorkspace(result.workspace);
            }
            return result.errors;
          }}
        />
        <CommitPlanner
          narratives={workspace.commitNarratives}
          onCreate={(draft) => {
            const result = addCommitNarrative(workspace, draft);
            if (Object.keys(result.errors).length === 0) {
              setWorkspace(result.workspace);
            }
            return result.errors;
          }}
          onRemove={(narrativeId) => {
            const narrative = workspace.commitNarratives.find(
              (item) => item.id === narrativeId,
            );
            if (
              narrative &&
              window.confirm(
                `Remove the commit narrative "${narrative.summary}"?`,
              )
            ) {
              setWorkspace((current) =>
                removeCommitNarrative(current, narrativeId),
              );
            }
          }}
        />
        <Summary workspace={workspace} />
      </section>
    </main>
  );
}
