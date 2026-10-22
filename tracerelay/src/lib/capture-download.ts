import type { CaptureCore } from "./capture-core";

export type CaptureExportFormat = "json" | "ndjson";

export type CaptureDownload = {
  filename: string;
  content: string;
  mimeType: "application/json" | "application/x-ndjson";
};

function safeSegment(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase()
    .slice(0, 64);
}

export function createCaptureDownload(
  capture: CaptureCore,
  captureName: string,
  traceId: string,
  format: CaptureExportFormat,
): CaptureDownload {
  const name = safeSegment(captureName) || "capture";
  const id = safeSegment(traceId) || "trace";
  return {
    filename: `tracerelay-${name}-${id}.${format}`,
    content: format === "json" ? capture.toJson() : capture.toNdjson(),
    mimeType: format === "json" ? "application/json" : "application/x-ndjson",
  };
}

export function downloadCaptureFile(download: CaptureDownload) {
  const url = URL.createObjectURL(new Blob([download.content], { type: download.mimeType }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = download.filename;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}
