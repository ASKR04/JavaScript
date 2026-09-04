export type FocusTarget = {
  focus: () => void;
};

type FocusScheduler = (callback: () => void) => unknown;

const scheduleNextFrame: FocusScheduler = (callback) =>
  window.requestAnimationFrame(callback);

export function focusFirstInvalidField<Field extends string>(
  fieldOrder: readonly Field[],
  errors: Partial<Record<Field, string | undefined>>,
  fields: Partial<Record<Field, FocusTarget | null | undefined>>,
  schedule: FocusScheduler = scheduleNextFrame,
): boolean {
  const firstInvalidField = fieldOrder.find(
    (field) => Boolean(errors[field]) && Boolean(fields[field]),
  );

  if (!firstInvalidField) return false;

  const target = fields[firstInvalidField];
  if (!target) return false;

  schedule(() => target.focus());
  return true;
}
