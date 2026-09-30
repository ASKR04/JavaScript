import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { selectCausalChain } from "./trace-analysis";
import { parseTraceText } from "./trace-parser";

const fixture = readFileSync(
  new URL("../../public/samples/checkout-success.json", import.meta.url),
  "utf8",
);

describe("selectCausalChain", () => {
  it("selects ancestors and descendants without treating sequence as causality", () => {
    const result = parseTraceText(fixture, {
      format: "json",
      importedAt: "2026-09-07T15:00:00.000Z",
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const chain = selectCausalChain(result.trace, "success-003");

    expect(chain?.focus.id).toBe("success-003");
    expect(chain?.ancestors.map(({ id }) => id)).toEqual(["success-001"]);
    expect(chain?.descendants.map(({ id }) => id)).toEqual([
      "success-004",
      "success-005",
      "success-006",
    ]);
    expect(chain?.relations).toHaveLength(4);
    expect(chain?.relations.every(({ kind }) => kind === "parent")).toBe(true);
  });

  it("returns no selection for an unknown event", () => {
    const result = parseTraceText(fixture, { format: "json" });
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(selectCausalChain(result.trace, "missing-event")).toBeUndefined();
  });
});
