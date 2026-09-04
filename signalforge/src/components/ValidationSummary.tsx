type ValidationSummaryProps = {
  errors: object;
};

export function ValidationSummary({ errors }: ValidationSummaryProps) {
  const errorCount = Object.values(errors).filter(Boolean).length;

  if (errorCount === 0) return null;

  return (
    <p className="validation-summary" role="status" aria-live="polite">
      {errorCount} {errorCount === 1 ? "field needs" : "fields need"} attention.
      Focus moved to the first invalid field.
    </p>
  );
}
