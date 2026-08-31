import { useEffect, useRef, useState } from "react";
import { WorkspaceToolbar } from "../components/WorkspaceToolbar";
import { CommitPlanner } from "../features/commits/CommitPlanner";
import { Dashboard } from "../features/dashboard/Dashboard";
import { Decisions } from "../features/decisions/Decisions";
import { Roadmap } from "../features/roadmap/Roadmap";
import { Summary } from "../features/summary/Summary";
import { createDefaultWorkspace } from "../lib/project-state";
import {
  createWorkspaceStorage,
  readWorkspace,
  WORKSPACE_STORAGE_KEY,
  type WorkspaceSnapshot,
} from "../lib/persistence";
import { createWorkspaceAutosave } from "../lib/workspace-autosave";
import {
  shouldProtectWorkspaceExit,
  type WorkspacePersistenceStatus,
} from "../lib/workspace-exit-protection";
import {
  beginWorkspaceReplacement,
  swapWorkspaceReplacement,
  type WorkspaceReplacementOperation,
  type WorkspaceReplacementRecovery,
} from "../lib/workspace-replacement";
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
  const [storage] = useState(() =>
    createWorkspaceStorage(() => window.localStorage),
  );
  const [initialLoad] = useState(() => readWorkspace(storage));
  const restoredSnapshot =
    initialLoad.status === "ready" ? initialLoad.snapshot : null;
  const [workspace, setWorkspace] = useState(
    () => restoredSnapshot?.workspace ?? createDefaultWorkspace(),
  );
  const [savedAt, setSavedAt] = useState(restoredSnapshot?.savedAt ?? null);
  const [unreadableWorkspace, setUnreadableWorkspace] = useState<string | null>(
    initialLoad.status === "invalid" ? initialLoad.serialized : null,
  );
  const [externalSnapshot, setExternalSnapshot] =
    useState<WorkspaceSnapshot | null>(null);
  const [replacementRecovery, setReplacementRecovery] =
    useState<WorkspaceReplacementRecovery | null>(null);
  const [saveStatus, setSaveStatus] = useState<WorkspacePersistenceStatus>(
    initialLoad.status === "invalid"
      ? "recovery"
      : initialLoad.status === "unavailable"
        ? "unavailable"
        : "saved",
  );
  const lastAutosaveWorkspace = useRef(workspace);
  const [autosave] = useState(() =>
    createWorkspaceAutosave({
      storage,
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
    if (unreadableWorkspace !== null) {
      setSaveStatus("recovery");
      return;
    }

    autosave.queue(workspace);
  }, [autosave, unreadableWorkspace, workspace]);

  useEffect(() => {
    const flushPendingSave = () => autosave.flush();
    window.addEventListener("pagehide", flushPendingSave);

    return () => {
      window.removeEventListener("pagehide", flushPendingSave);
      autosave.cancel();
    };
  }, [autosave]);

  useEffect(() => {
    if (!shouldProtectWorkspaceExit(saveStatus)) return;

    const protectUnsavedWorkspace = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = true;
    };
    window.addEventListener("beforeunload", protectUnsavedWorkspace);
    return () =>
      window.removeEventListener("beforeunload", protectUnsavedWorkspace);
  }, [saveStatus]);

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
        setUnreadableWorkspace(null);
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

  function replaceWorkspace(
    replacement: typeof workspace,
    operation: WorkspaceReplacementOperation,
  ) {
    autosave.cancel();
    setExternalSnapshot(null);
    setUnreadableWorkspace(null);
    setReplacementRecovery(beginWorkspaceReplacement(workspace, operation));
    setSavedAt(null);
    setWorkspace(replacement);
  }

  function resetWorkspace() {
    const shouldReset = window.confirm(
      "Reset your local changes and restore the SignalForge sample workspace?",
    );
    if (!shouldReset) return;

    replaceWorkspace(createDefaultWorkspace(), "sample reset");
  }

  function toggleWorkspaceReplacement() {
    if (!replacementRecovery) return;

    const result = swapWorkspaceReplacement(workspace, replacementRecovery);
    autosave.cancel();
    setExternalSnapshot(null);
    setSavedAt(null);
    setWorkspace(result.workspace);
    setReplacementRecovery(result.recovery);
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
          unreadableWorkspace={unreadableWorkspace}
          replacementRecovery={replacementRecovery}
          onLoadExternalChange={() => {
            if (!externalSnapshot) return;

            autosave.cancel();
            lastAutosaveWorkspace.current = externalSnapshot.workspace;
            setSaveStatus("saved");
            setSavedAt(externalSnapshot.savedAt);
            setUnreadableWorkspace(null);
            setWorkspace(externalSnapshot.workspace);
            setExternalSnapshot(null);
          }}
          onKeepCurrent={() => {
            setExternalSnapshot(null);
            setUnreadableWorkspace(null);
            autosave.queue(workspace);
          }}
          onRestore={(restoredWorkspace) =>
            replaceWorkspace(restoredWorkspace, "backup restore")
          }
          onRetrySave={() => {
            autosave.queue(workspace);
            autosave.flush();
          }}
          onReplaceUnreadableWorkspace={() => {
            setUnreadableWorkspace(null);
            autosave.queue(workspace);
          }}
          onReset={resetWorkspace}
          onToggleReplacement={toggleWorkspaceReplacement}
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
