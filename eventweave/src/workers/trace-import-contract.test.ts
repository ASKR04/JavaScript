import { describe, expect, it } from "vitest";
import { isTraceImportRequest } from "./trace-import-contract";

describe("isTraceImportRequest", () => {
  it("accepts a complete parse request", () => {
    expect(
      isTraceImportRequest({
        type: "parse-trace",
        requestId: "request-1",
        payload: {
          text: "{}",
          format: "json",
          importedAt: "2026-09-04T15:00:00.000Z",
        },
      }),
    ).toBe(true);
  });

  it("rejects unknown formats and blank identities", () => {
    expect(
      isTraceImportRequest({
        type: "parse-trace",
        requestId: " ",
        payload: { text: "{}", format: "csv", importedAt: "now" },
      }),
    ).toBe(false);
  });

  it("rejects an invalid import timestamp", () => {
    expect(
      isTraceImportRequest({
        type: "parse-trace",
        requestId: "request-1",
        payload: { text: "{}", format: "json", importedAt: "not-a-date" },
      }),
    ).toBe(false);
  });
});
