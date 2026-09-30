import { useEffect, useId, useState } from "react";

import type { EventFilters } from "../lib/event-filters";
import type {
  InvestigationService,
  InvestigationSummary,
  RestoredInvestigation,
} from "../lib/investigation-service";
import type { NormalizedTrace } from "../lib/trace-model";
import styles from "./InvestigationPanel.module.css";

export interface InvestigationPanelProps {
  service: InvestigationService;
  trace: NormalizedTrace;
  sessionId: string;
  eventId: string;
  filters: EventFilters;
  onRestore: (investigation: RestoredInvestigation) => string | undefined;
}

const describeErrors = (errors: { message: string }[]): string =>
  errors.map(({ message }) => message).join(" ");

export const InvestigationPanel = ({
  service,
  trace,
  sessionId,
  eventId,
  filters,
  onRestore,
}: InvestigationPanelProps) => {
  const nameId = useId();
  const selectId = useId();
  const statusId = useId();
  const [name, setName] = useState("");
  const [investigations, setInvestigations] = useState<InvestigationSummary[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [removeConfirmationId, setRemoveConfirmationId] = useState("");
  const [status, setStatus] = useState("Saved investigations stay in this browser and never include trace contents.");
  const [isBusy, setIsBusy] = useState(false);

  useEffect(() => {
    let active = true;
    setIsBusy(true);
    void service.list(trace).then((result) => {
      if (!active) return;
      setIsBusy(false);
      if (!result.ok) {
        setInvestigations([]);
        setSelectedId("");
        setStatus(describeErrors(result.errors));
        return;
      }
      setInvestigations(result.value);
      setSelectedId((current) => result.value.some(({ id }) => id === current) ? current : result.value[0]?.id ?? "");
      setStatus(result.value.length === 0
        ? "No investigations are saved for this trace yet."
        : `${result.value.length} saved investigation${result.value.length === 1 ? "" : "s"} available for this trace.`);
    });
    return () => { active = false; };
  }, [service, trace]);

  const save = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmedName = name.trim();
    if (trimmedName === "") {
      setStatus("Enter a short investigation name before saving.");
      return;
    }
    setIsBusy(true);
    setStatus("Saving this investigation locally.");
    const result = await service.save({ name: trimmedName, trace, sessionId, eventId, filters });
    setIsBusy(false);
    if (!result.ok) {
      setStatus(describeErrors(result.errors));
      return;
    }
    setInvestigations((current) => [result.value, ...current.filter(({ id }) => id !== result.value.id)]);
    setSelectedId(result.value.id);
    setRemoveConfirmationId("");
    setName("");
    setStatus(`Saved “${result.value.name}” in this browser.`);
  };

  const restore = async () => {
    if (selectedId === "") {
      setStatus("Choose a saved investigation to restore.");
      return;
    }
    setRemoveConfirmationId("");
    setIsBusy(true);
    setStatus("Restoring the selected investigation.");
    const result = await service.restore(selectedId, trace);
    setIsBusy(false);
    if (!result.ok) {
      setStatus(describeErrors(result.errors));
      return;
    }
    const restoreError = onRestore(result.value);
    setStatus(restoreError ?? `Restored “${result.value.name}” with its saved session, event, and filters.`);
  };

  const remove = async () => {
    if (selectedId === "") {
      setStatus("Choose a saved investigation to remove.");
      return;
    }
    const selected = investigations.find(({ id }) => id === selectedId);
    if (removeConfirmationId !== selectedId) {
      setRemoveConfirmationId(selectedId);
      setStatus(`Select “Confirm removal” to remove “${selected?.name ?? "this investigation"}” from this browser.`);
      return;
    }
    setIsBusy(true);
    setStatus("Removing the selected investigation.");
    const result = await service.remove(selectedId);
    setIsBusy(false);
    if (!result.ok) {
      setStatus(describeErrors(result.errors));
      return;
    }
    const remaining = investigations.filter(({ id }) => id !== selectedId);
    setInvestigations(remaining);
    setSelectedId(remaining[0]?.id ?? "");
    setRemoveConfirmationId("");
    setStatus(`Removed “${selected?.name ?? "the investigation"}” from this browser.`);
  };

  return (
    <section className={styles.panel} aria-labelledby={`${statusId}-title`}>
      <div className={styles.heading}>
        <div>
          <p className="eyebrow">Local investigation</p>
          <h3 id={`${statusId}-title`}>Save this exact debugging context.</h3>
        </div>
        <span>Trace data stays in memory</span>
      </div>

      <div className={styles.grid}>
        <form className={styles.saveForm} onSubmit={(event) => void save(event)}>
          <label htmlFor={nameId}>Investigation name</label>
          <div className={styles.inlineControls}>
            <input
              id={nameId}
              value={name}
              maxLength={120}
              onChange={(event) => setName(event.currentTarget.value)}
              placeholder="Payment timeout review"
              disabled={isBusy}
            />
            <button type="submit" disabled={isBusy}>Save locally</button>
          </div>
          <p>Captures the selected session, event, and filters—not imported trace contents.</p>
        </form>

        <div className={styles.restoreControls}>
          <label htmlFor={selectId}>Saved investigation</label>
          <select
            id={selectId}
            value={selectedId}
            onChange={(event) => {
              setSelectedId(event.currentTarget.value);
              setRemoveConfirmationId("");
            }}
            disabled={isBusy || investigations.length === 0}
          >
            {investigations.length === 0 && <option value="">Nothing saved for this trace</option>}
            {investigations.map((investigation) => (
              <option key={investigation.id} value={investigation.id}>{investigation.name}</option>
            ))}
          </select>
          <div className={styles.actions}>
            <button type="button" onClick={() => void restore()} disabled={isBusy || selectedId === ""}>Restore</button>
            <button type="button" className={styles.removeButton} onClick={() => void remove()} disabled={isBusy || selectedId === ""}>
              {selectedId !== "" && removeConfirmationId === selectedId ? "Confirm removal" : "Remove"}
            </button>
          </div>
        </div>
      </div>

      <p id={statusId} className={styles.status} role="status" aria-live="polite">{status}</p>
    </section>
  );
};
