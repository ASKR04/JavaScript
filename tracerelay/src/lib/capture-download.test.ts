import { describe, expect, it } from "vitest";
import {
  createCaptureDownload,
  downloadCaptureFile,
  type CaptureDownloadEnvironment,
} from "./capture-download";
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

describe("downloadCaptureFile", () => {
  it("downloads through the browser boundary and revokes the temporary URL", () => {
    const calls: string[] = [];
    const anchor = {
      href: "",
      download: "",
      click: () => calls.push("click"),
      remove: () => calls.push("remove"),
    };
    const environment: CaptureDownloadEnvironment = {
      createObjectUrl: (content, mimeType) => {
        calls.push(`create:${mimeType}:${content}`);
        return "blob:trace-export";
      },
      createAnchor: () => anchor,
      appendAnchor: () => calls.push("append"),
      scheduleCleanup: (cleanup) => {
        calls.push("schedule");
        cleanup();
      },
      revokeObjectUrl: (url) => calls.push(`revoke:${url}`),
    };

    downloadCaptureFile(
      {
        filename: "tracerelay-profile-trace-demo.json",
        content: '{"traceId":"trace-demo"}\n',
        mimeType: "application/json",
      },
      environment,
    );

    expect(anchor.href).toBe("blob:trace-export");
    expect(anchor.download).toBe("tracerelay-profile-trace-demo.json");
    expect(calls).toEqual([
      'create:application/json:{"traceId":"trace-demo"}\n',
      "append",
      "click",
      "remove",
      "schedule",
      "revoke:blob:trace-export",
    ]);
  });
});
