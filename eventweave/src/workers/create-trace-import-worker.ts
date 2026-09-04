export const createTraceImportWorker = (): Worker =>
  new Worker(new URL("./trace-import.worker.ts", import.meta.url), { type: "module" });
