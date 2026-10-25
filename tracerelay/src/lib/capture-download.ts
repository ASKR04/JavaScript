import type { CaptureCore } from "./capture-core";

export type CaptureExportFormat = "json" | "ndjson";

export type CaptureDownload = {
  filename: string;
  content: string;
  mimeType: "application/json" | "application/x-ndjson";
};

type DownloadAnchor = {
  href: string;
  download: string;
  click: () => void;
  remove: () => void;
};

export type CaptureDownloadEnvironment = {
  createObjectUrl: (content: string, mimeType: CaptureDownload["mimeType"]) => string;
  createAnchor: () => DownloadAnchor;
  appendAnchor: (anchor: DownloadAnchor) => void;
  scheduleCleanup: (cleanup: () => void) => void;
  revokeObjectUrl: (url: string) => void;
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

function browserDownloadEnvironment(): CaptureDownloadEnvironment {
  return {
    createObjectUrl: (content, mimeType) =>
      URL.createObjectURL(new Blob([content], { type: mimeType })),
    createAnchor: () => document.createElement("a"),
    appendAnchor: (anchor) => document.body.append(anchor as HTMLAnchorElement),
    scheduleCleanup: (cleanup) => window.setTimeout(cleanup, 0),
    revokeObjectUrl: (url) => URL.revokeObjectURL(url),
  };
}

export function downloadCaptureFile(
  download: CaptureDownload,
  environment: CaptureDownloadEnvironment = browserDownloadEnvironment(),
) {
  const url = environment.createObjectUrl(download.content, download.mimeType);
  const anchor = environment.createAnchor();
  anchor.href = url;
  anchor.download = download.filename;
  environment.appendAnchor(anchor);
  anchor.click();
  anchor.remove();
  environment.scheduleCleanup(() => environment.revokeObjectUrl(url));
}
