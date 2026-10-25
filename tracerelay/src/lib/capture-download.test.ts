import { describe, expect, it } from "vitest";
import { createCaptureDownload } from "./capture-download";
import { createDemoCapture, recordProfileJourney } from "./demo-journey";

describe("createCaptureDownload", () => {
  it.each([
    ["json", "application/json"],
    ["ndjson", "application/x-ndjson"],
  ] as const)("prepares a safe deterministic %s download", (format, mimeType) => {
    const demo = createDemoCapture();
    const metadata = demo.capture.start();
    recordProfileJourney(demo, "failure");
    demo.capture.stop();

    const download = createCaptureDownload(
      demo.capture,
      "Profile save: unavailable / synthetic",
      metadata.traceId,
      format,
    );
    expect(download.filename).toBe(
      `tracerelay-profile-save-unavailable-synthetic-trace-demo-001.${format}`,
    );
    expect(download.mimeType).toBe(mimeType);
    expect(download.content).not.toContain("synthetic-secret-that-must-not-survive");
    expect(download.content.endsWith("\n")).toBe(true);
  });
});
