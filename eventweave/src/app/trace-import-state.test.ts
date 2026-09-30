import { describe, expect, it } from "vitest";

import type { NormalizedTrace } from "../lib/trace-model";
import { initialTraceImportState, reduceTraceImportState } from "./trace-import-state";

const emptyTrace: NormalizedTrace = {
  schemaVersion: "1.0",
  importedAt: "2026-09-07T22:00:00.000Z",
  sessions: [],
  events: [],
  relations: [],
};

describe("trace import state", () => {
  it("ignores stale file-reader and worker results", () => {
    const first = reduceTraceImportState(initialTraceImportState, {
      type: "read-started",
      requestId: "first",
      fileName: "first.json",
      format: "json",
    });
    const second = reduceTraceImportState(first, {
      type: "read-started",
      requestId: "second",
      fileName: "second.ndjson",
      format: "ndjson",
    });

    expect(reduceTraceImportState(second, {
      type: "parse-finished",
      requestId: "first",
      result: { ok: true, format: "json", trace: emptyTrace },
    })).toBe(second);
    expect(reduceTraceImportState(second, {
      type: "read-failed",
      requestId: "first",
      message: "Old read failed.",
    })).toBe(second);
  });

  it("retains the last valid trace when a replacement import fails", () => {
    const reading = reduceTraceImportState(
      { ...initialTraceImportState, phase: "success", trace: emptyTrace },
      { type: "read-started", requestId: "next", fileName: "broken.json", format: "json" },
    );
    const failed = reduceTraceImportState(reading, {
      type: "parse-finished",
      requestId: "next",
      result: {
        ok: false,
        format: "json",
        errors: [{ code: "invalid-json", message: "The JSON is malformed." }],
      },
    });

    expect(failed.phase).toBe("error");
    expect(failed.trace).toBe(emptyTrace);
    expect(failed.errors).toHaveLength(1);
  });

  it("moves the active request through reading, parsing, and success", () => {
    const reading = reduceTraceImportState(initialTraceImportState, {
      type: "read-started",
      requestId: "active",
      fileName: "trace.json",
      format: "json",
    });
    const parsing = reduceTraceImportState(reading, { type: "parse-started", requestId: "active" });
    const success = reduceTraceImportState(parsing, {
      type: "parse-finished",
      requestId: "active",
      result: { ok: true, format: "json", trace: emptyTrace },
    });

    expect(parsing.phase).toBe("parsing");
    expect(success).toMatchObject({ phase: "success", trace: emptyTrace, errors: [] });
  });
});
