import { describe, expect, it } from "vitest";
import { SyntheticEvidenceAdapter } from "./mock-adapters";

describe("SyntheticEvidenceAdapter", () => {
  it("exposes a stable in-memory snapshot without a connector", async () => {
    const source = [{ id: "synthetic-1" }];
    const adapter = new SyntheticEvidenceAdapter("log", source);
    source.push({ id: "synthetic-2" });
    expect(adapter.source).toBe("log");
    expect(await adapter.load()).toEqual([{ id: "synthetic-1" }]);
  });
});
