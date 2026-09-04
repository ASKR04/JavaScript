import { useId, useRef, useState } from "react";
import type { FormEvent } from "react";
import { focusFirstInvalidField } from "../lib/focus-validation";
import type {
  WorkItemDraft,
  WorkItemErrors,
} from "../lib/workspace-state";
import { ValidationSummary } from "./ValidationSummary";

type WorkItemComposerProps = {
  title: string;
  description: string;
  titleLabel: string;
  detailsLabel: string;
  submitLabel: string;
  onSubmit: (draft: WorkItemDraft) => WorkItemErrors;
};

export function WorkItemComposer({
  title,
  description,
  titleLabel,
  detailsLabel,
  submitLabel,
  onSubmit,
}: WorkItemComposerProps) {
  const [draft, setDraft] = useState<WorkItemDraft>({ title: "", details: "" });
  const [errors, setErrors] = useState<WorkItemErrors>({});
  const titleInput = useRef<HTMLInputElement>(null);
  const detailsInput = useRef<HTMLTextAreaElement>(null);
  const formId = useId();

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextErrors = onSubmit(draft);
    setErrors(nextErrors);

    if (Object.keys(nextErrors).length === 0) {
      setDraft({ title: "", details: "" });
      titleInput.current?.focus();
      return;
    }

    focusFirstInvalidField(
      ["title", "details"],
      nextErrors,
      { title: titleInput.current, details: detailsInput.current },
    );
  }

  return (
    <form className="work-item-composer" onSubmit={submit} noValidate>
      <div className="section-heading compact-heading">
        <p className="eyebrow">Add to the plan</p>
        <h3>{title}</h3>
        <p>{description}</p>
      </div>

      <div className="composer-fields">
        <label htmlFor={`${formId}-title`}>
          {titleLabel}
          <input
            ref={titleInput}
            id={`${formId}-title`}
            value={draft.title}
            aria-invalid={Boolean(errors.title)}
            aria-describedby={
              errors.title ? `${formId}-title-error` : undefined
            }
            onChange={(event) => {
              setDraft((current) => ({
                ...current,
                title: event.target.value,
              }));
              setErrors((current) => ({ ...current, title: undefined }));
            }}
          />
          {errors.title && (
            <span className="field-error" id={`${formId}-title-error`}>
              {errors.title}
            </span>
          )}
        </label>

        <label htmlFor={`${formId}-details`}>
          {detailsLabel}
          <textarea
            ref={detailsInput}
            id={`${formId}-details`}
            rows={3}
            value={draft.details}
            aria-invalid={Boolean(errors.details)}
            aria-describedby={
              errors.details ? `${formId}-details-error` : undefined
            }
            onChange={(event) => {
              setDraft((current) => ({
                ...current,
                details: event.target.value,
              }));
              setErrors((current) => ({ ...current, details: undefined }));
            }}
          />
          {errors.details && (
            <span className="field-error" id={`${formId}-details-error`}>
              {errors.details}
            </span>
          )}
        </label>
      </div>

      <ValidationSummary errors={errors} />

      <button className="primary-button" type="submit">
        {submitLabel}
      </button>
    </form>
  );
}
