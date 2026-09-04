import { type FormEvent, useRef, useState } from "react";
import { ValidationSummary } from "../../components/ValidationSummary";
import { focusFirstInvalidField } from "../../lib/focus-validation";
import {
  commitKinds,
  type CommitNarrative,
} from "../../lib/project-state";
import {
  formatCommitBody,
  formatCommitSubject,
  type CommitNarrativeDraft,
  type CommitNarrativeErrors,
} from "../../lib/workspace-state";

type CommitPlannerProps = {
  narratives: CommitNarrative[];
  onCreate: (draft: CommitNarrativeDraft) => CommitNarrativeErrors;
  onRemove: (narrativeId: string) => void;
};

function getLocalDate(): string {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

const initialDraft: CommitNarrativeDraft = {
  date: getLocalDate(),
  kind: "feat",
  scope: "signalforge",
  summary: "",
  implementation: "",
  evidence: "",
};

export function CommitPlanner({
  narratives,
  onCreate,
  onRemove,
}: CommitPlannerProps) {
  const [draft, setDraft] = useState(initialDraft);
  const [errors, setErrors] = useState<CommitNarrativeErrors>({});
  const fieldRefs = useRef<
    Partial<Record<keyof CommitNarrativeDraft, HTMLElement | null>>
  >({});
  const [copyStatus, setCopyStatus] = useState<{
    id: string;
    state: "copied" | "error";
  } | null>(null);
  const previewSubject = formatCommitSubject(draft);

  function submitNarrative(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextErrors = onCreate(draft);
    setErrors(nextErrors);

    if (Object.keys(nextErrors).length === 0) {
      setDraft((current) => ({
        ...initialDraft,
        date: current.date,
        kind: current.kind,
        scope: current.scope,
      }));
      return;
    }

    focusFirstInvalidField(
      ["date", "scope", "summary", "implementation", "evidence"],
      nextErrors,
      fieldRefs.current,
    );
  }

  function updateDraft<Key extends keyof CommitNarrativeDraft>(
    field: Key,
    value: CommitNarrativeDraft[Key],
  ) {
    setDraft((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
  }

  async function copyNarrative(narrative: CommitNarrative) {
    try {
      const content = `${formatCommitSubject(narrative)}\n\n${formatCommitBody(narrative)}`;
      await navigator.clipboard.writeText(content);
      setCopyStatus({ id: narrative.id, state: "copied" });
    } catch {
      setCopyStatus({ id: narrative.id, state: "error" });
    }
  }

  return (
    <section className="panel commit-panel" id="commits">
      <div className="section-heading">
        <p className="eyebrow">Commit Narrative</p>
        <h2>Connect daily implementation work to durable evidence</h2>
        <p>
          Shape a reviewable commit subject, record what changed, and preserve
          the proof that supports it. Each entry becomes part of the exported
          project story.
        </p>
      </div>

      <form className="commit-composer" onSubmit={submitNarrative} noValidate>
        <div className="commit-meta-fields">
          <label>
            Work date
            <input
              ref={(element) => {
                fieldRefs.current.date = element;
              }}
              type="date"
              value={draft.date}
              onChange={(event) => updateDraft("date", event.target.value)}
              aria-invalid={Boolean(errors.date)}
              aria-describedby={errors.date ? "commit-date-error" : undefined}
            />
            {errors.date && (
              <span className="field-error" id="commit-date-error">
                {errors.date}
              </span>
            )}
          </label>
          <label>
            Change type
            <select
              value={draft.kind}
              onChange={(event) =>
                updateDraft(
                  "kind",
                  event.target.value as CommitNarrativeDraft["kind"],
                )
              }
            >
              {commitKinds.map((kind) => (
                <option key={kind} value={kind}>
                  {kind}
                </option>
              ))}
            </select>
          </label>
          <label>
            Scope
            <input
              ref={(element) => {
                fieldRefs.current.scope = element;
              }}
              value={draft.scope}
              onChange={(event) => updateDraft("scope", event.target.value)}
              placeholder="signalforge"
              aria-invalid={Boolean(errors.scope)}
              aria-describedby={
                errors.scope ? "commit-scope-error" : undefined
              }
            />
            {errors.scope && (
              <span className="field-error" id="commit-scope-error">
                {errors.scope}
              </span>
            )}
          </label>
        </div>

        <label className="commit-summary-field">
          Delivered change
          <input
            ref={(element) => {
              fieldRefs.current.summary = element;
            }}
            value={draft.summary}
            onChange={(event) => updateDraft("summary", event.target.value)}
            placeholder="add review-ready commit narratives"
            aria-invalid={Boolean(errors.summary)}
            aria-describedby={`commit-subject-preview${
              errors.summary ? " commit-summary-error" : ""
            }`}
          />
          <span className="commit-subject-preview" id="commit-subject-preview">
            {previewSubject} <small>{previewSubject.length}/72</small>
          </span>
          {errors.summary && (
            <span className="field-error" id="commit-summary-error">
              {errors.summary}
            </span>
          )}
        </label>

        <div className="commit-evidence-fields">
          <label>
            Implementation note
            <textarea
              ref={(element) => {
                fieldRefs.current.implementation = element;
              }}
              value={draft.implementation}
              onChange={(event) =>
                updateDraft("implementation", event.target.value)
              }
              placeholder="Describe the meaningful code or product change."
              aria-invalid={Boolean(errors.implementation)}
              aria-describedby={
                errors.implementation
                  ? "commit-implementation-error"
                  : undefined
              }
            />
            {errors.implementation && (
              <span className="field-error" id="commit-implementation-error">
                {errors.implementation}
              </span>
            )}
          </label>
          <label>
            Verification evidence
            <textarea
              ref={(element) => {
                fieldRefs.current.evidence = element;
              }}
              value={draft.evidence}
              onChange={(event) => updateDraft("evidence", event.target.value)}
              placeholder="Record tests, builds, reviews, or measurable outcomes."
              aria-invalid={Boolean(errors.evidence)}
              aria-describedby={
                errors.evidence ? "commit-evidence-error" : undefined
              }
            />
            {errors.evidence && (
              <span className="field-error" id="commit-evidence-error">
                {errors.evidence}
              </span>
            )}
          </label>
        </div>

        <ValidationSummary errors={errors} />

        <button className="primary-button" type="submit">
          Save narrative
        </button>
      </form>

      <div className="commit-narrative-list" aria-label="Saved commit narratives">
        {narratives.length === 0 ? (
          <p className="empty-state">
            No commit evidence yet. Capture today&apos;s first reviewable change.
          </p>
        ) : (
          narratives.map((narrative) => {
            const status = copyStatus?.id === narrative.id ? copyStatus.state : null;

            return (
              <article className="commit-narrative-card" key={narrative.id}>
                <div className="card-toolbar">
                  <time dateTime={narrative.date}>{narrative.date}</time>
                  <button
                    className="text-button danger-button"
                    type="button"
                    onClick={() => onRemove(narrative.id)}
                    aria-label={`Remove commit narrative ${formatCommitSubject(narrative)}`}
                  >
                    Remove
                  </button>
                </div>
                <code>{formatCommitSubject(narrative)}</code>
                <p>{narrative.implementation}</p>
                <div className="commit-proof">
                  <strong>Verification</strong>
                  <p>{narrative.evidence}</p>
                </div>
                <div className="commit-copy-row">
                  <button
                    className="secondary-button"
                    type="button"
                    onClick={() => copyNarrative(narrative)}
                  >
                    Copy commit message
                  </button>
                  <span
                    className={status === "error" ? "copy-error" : ""}
                    aria-live="polite"
                  >
                    {status === "copied"
                      ? "Copied."
                      : status === "error"
                        ? "Clipboard access failed."
                        : ""}
                  </span>
                </div>
              </article>
            );
          })
        )}
      </div>
    </section>
  );
}
