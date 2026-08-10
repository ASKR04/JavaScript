import type { ProjectWorkspace } from "../../lib/project-state";
import type { ProjectBriefPatch } from "../../lib/workspace-state";

type ProjectBriefEditorProps = {
  workspace: ProjectWorkspace;
  onChange: (patch: ProjectBriefPatch) => void;
};

export function ProjectBriefEditor({
  workspace,
  onChange,
}: ProjectBriefEditorProps) {
  return (
    <div className="brief-editor" aria-labelledby="brief-editor-title">
      <div className="section-heading compact-heading">
        <p className="eyebrow">Editable brief</p>
        <h3 id="brief-editor-title">Keep the product intent close to the work</h3>
      </div>

      <div className="form-grid">
        <label>
          Project name
          <input
            value={workspace.name}
            onChange={(event) => onChange({ name: event.target.value })}
          />
        </label>
        <label>
          Target audience
          <input
            value={workspace.audience}
            onChange={(event) => onChange({ audience: event.target.value })}
          />
        </label>
        <label className="full-field">
          Product description
          <textarea
            rows={3}
            value={workspace.description}
            onChange={(event) => onChange({ description: event.target.value })}
          />
        </label>
        <label className="full-field">
          Value proposition
          <textarea
            rows={3}
            value={workspace.value}
            onChange={(event) => onChange({ value: event.target.value })}
          />
        </label>
        <label className="full-field">
          Next proof point
          <input
            value={workspace.nextProofPoint}
            onChange={(event) => onChange({ nextProofPoint: event.target.value })}
          />
        </label>
      </div>
    </div>
  );
}
