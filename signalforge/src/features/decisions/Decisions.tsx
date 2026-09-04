import { useEffect, useRef, useState, type FormEvent } from "react";
import { ValidationSummary } from "../../components/ValidationSummary";
import { focusFirstInvalidField } from "../../lib/focus-validation";
import type { ArchitectureDecision } from "../../lib/project-state";
import type {
  DecisionDraft,
  DecisionErrors,
} from "../../lib/workspace-state";

type DecisionsProps = {
  decisions: ArchitectureDecision[];
  onCreate: (draft: DecisionDraft) => DecisionErrors;
  onRemove: (decisionId: string) => void;
  onUpdate: (decisionId: string, draft: DecisionDraft) => DecisionErrors;
};

const emptyDecision: DecisionDraft = { title: "", context: "", impact: "" };

type DecisionEditorProps = {
  decision: ArchitectureDecision;
  onRemove: (decisionId: string) => void;
  onUpdate: (decisionId: string, draft: DecisionDraft) => DecisionErrors;
};

function DecisionEditor({
  decision,
  onRemove,
  onUpdate,
}: DecisionEditorProps) {
  const [draft, setDraft] = useState<DecisionDraft>(decision);
  const [errors, setErrors] = useState<DecisionErrors>({});
  const [saved, setSaved] = useState(false);
  const fieldRefs = useRef<
    Partial<Record<keyof DecisionDraft, HTMLElement | null>>
  >({});

  useEffect(() => {
    setDraft(decision);
    setErrors({});
  }, [decision]);

  function updateField(field: keyof DecisionDraft, value: string) {
    setDraft((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
    setSaved(false);
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextErrors = onUpdate(decision.id, draft);
    setErrors(nextErrors);
    setSaved(Object.keys(nextErrors).length === 0);
    focusFirstInvalidField(
      ["title", "context", "impact"],
      nextErrors,
      fieldRefs.current,
    );
  }

  const fieldId = (field: keyof DecisionDraft) =>
    `${decision.id.toLowerCase()}-${field}`;

  return (
    <form className="decision-card decision-editor" onSubmit={submit}>
      <div className="card-toolbar">
        <p className="decision-id">{decision.id}</p>
        <button
          className="text-button danger-button"
          type="button"
          onClick={() => onRemove(decision.id)}
        >
          Remove
        </button>
      </div>

      <label htmlFor={fieldId("title")}>
        Decision title
        <input
          ref={(element) => {
            fieldRefs.current.title = element;
          }}
          id={fieldId("title")}
          value={draft.title}
          onChange={(event) => updateField("title", event.target.value)}
          aria-invalid={Boolean(errors.title)}
          aria-describedby={
            errors.title ? `${fieldId("title")}-error` : undefined
          }
        />
        {errors.title && (
          <span className="field-error" id={`${fieldId("title")}-error`}>
            {errors.title}
          </span>
        )}
      </label>

      <label htmlFor={fieldId("context")}>
        Context
        <textarea
          ref={(element) => {
            fieldRefs.current.context = element;
          }}
          id={fieldId("context")}
          value={draft.context}
          onChange={(event) => updateField("context", event.target.value)}
          aria-invalid={Boolean(errors.context)}
          aria-describedby={
            errors.context ? `${fieldId("context")}-error` : undefined
          }
        />
        {errors.context && (
          <span className="field-error" id={`${fieldId("context")}-error`}>
            {errors.context}
          </span>
        )}
      </label>

      <label htmlFor={fieldId("impact")}>
        Consequence
        <textarea
          ref={(element) => {
            fieldRefs.current.impact = element;
          }}
          id={fieldId("impact")}
          value={draft.impact}
          onChange={(event) => updateField("impact", event.target.value)}
          aria-invalid={Boolean(errors.impact)}
          aria-describedby={
            errors.impact ? `${fieldId("impact")}-error` : undefined
          }
        />
        {errors.impact && (
          <span className="field-error" id={`${fieldId("impact")}-error`}>
            {errors.impact}
          </span>
        )}
      </label>

      <ValidationSummary errors={errors} />

      <div className="decision-actions">
        <button className="secondary-button" type="submit">
          Save decision
        </button>
        <span className="save-confirmation" role="status" aria-live="polite">
          {saved ? "Decision updated." : ""}
        </span>
      </div>
    </form>
  );
}

export function Decisions({
  decisions,
  onCreate,
  onRemove,
  onUpdate,
}: DecisionsProps) {
  const [draft, setDraft] = useState<DecisionDraft>(emptyDecision);
  const [errors, setErrors] = useState<DecisionErrors>({});
  const fieldRefs = useRef<
    Partial<Record<keyof DecisionDraft, HTMLElement | null>>
  >({});

  function updateField(field: keyof DecisionDraft, value: string) {
    setDraft((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextErrors = onCreate(draft);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length === 0) {
      setDraft(emptyDecision);
      fieldRefs.current.title?.focus();
      return;
    }

    focusFirstInvalidField(
      ["title", "context", "impact"],
      nextErrors,
      fieldRefs.current,
    );
  }

  return (
    <section className="panel" id="decisions">
      <div className="section-heading">
        <p className="eyebrow">Architecture</p>
        <h2>Decisions with context and consequences</h2>
        <p>
          Keep the reasoning behind technical choices close to the project plan,
          then refine each record as the implementation reveals new tradeoffs.
        </p>
      </div>

      <div className="decision-list">
        {decisions.map((decision) => (
          <DecisionEditor
            decision={decision}
            key={decision.id}
            onRemove={onRemove}
            onUpdate={onUpdate}
          />
        ))}
      </div>

      <form className="decision-composer" onSubmit={submit}>
        <div className="compact-heading">
          <p className="eyebrow">New record</p>
          <h3>Capture an architecture decision</h3>
          <p>
            Record the constraint, the choice, and what that choice changes for
            the project.
          </p>
        </div>

        <div className="decision-composer-fields">
          {(
            [
              ["title", "Decision title", "e.g. Keep exports browser-native"],
              [
                "context",
                "Context",
                "What constraint or need prompted this decision?",
              ],
              [
                "impact",
                "Consequence",
                "What does this choice enable or require?",
              ],
            ] as const
          ).map(([field, label, placeholder]) => {
            const inputId = `new-decision-${field}`;
            const errorId = `${inputId}-error`;
            const isLongField = field !== "title";

            return (
              <label
                className={isLongField ? "long-field" : undefined}
                htmlFor={inputId}
                key={field}
              >
                {label}
                {isLongField ? (
                  <textarea
                    ref={(element) => {
                      fieldRefs.current[field] = element;
                    }}
                    id={inputId}
                    placeholder={placeholder}
                    value={draft[field]}
                    onChange={(event) => updateField(field, event.target.value)}
                    aria-invalid={Boolean(errors[field])}
                    aria-describedby={errors[field] ? errorId : undefined}
                  />
                ) : (
                  <input
                    ref={(element) => {
                      fieldRefs.current[field] = element;
                    }}
                    id={inputId}
                    placeholder={placeholder}
                    value={draft[field]}
                    onChange={(event) => updateField(field, event.target.value)}
                    aria-invalid={Boolean(errors[field])}
                    aria-describedby={errors[field] ? errorId : undefined}
                  />
                )}
                {errors[field] && (
                  <span className="field-error" id={errorId}>
                    {errors[field]}
                  </span>
                )}
              </label>
            );
          })}
        </div>

        <ValidationSummary errors={errors} />

        <button className="primary-button" type="submit">
          Add decision
        </button>
      </form>
    </section>
  );
}
