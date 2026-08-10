import { Dashboard } from "../features/dashboard/Dashboard";
import { Decisions } from "../features/decisions/Decisions";
import { Roadmap } from "../features/roadmap/Roadmap";
import { Summary } from "../features/summary/Summary";
import { projectWorkspace } from "../lib/project-state";

export function App() {
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
        <Dashboard workspace={projectWorkspace} />
        <Roadmap items={projectWorkspace.roadmap} />
        <Decisions decisions={projectWorkspace.decisions} />
        <Summary workspace={projectWorkspace} />
      </section>
    </main>
  );
}

