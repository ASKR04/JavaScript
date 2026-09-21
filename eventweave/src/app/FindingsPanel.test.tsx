import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { parseTraceText } from "../lib/trace-parser";
import { FindingsPanel } from "./FindingsPanel";

const failureFixture = readFileSync(new URL("../../public/samples/checkout-failure.ndjson", import.meta.url), "utf8");
const successFixture = readFileSync(new URL("../../public/samples/checkout-success.json", import.meta.url), "utf8");

const renderFixture = (text: string, format: "json" | "ndjson") => {
  const result = parseTraceText(text, { format });
  expect(result.ok).toBe(true);
  if (!result.ok) throw new Error("Fixture did not parse");
  return renderToStaticMarkup(
    <FindingsPanel trace={result.trace} sessionId={result.trace.sessions[0].id} onSelectEvent={() => {}} />,
  );
};

describe("FindingsPanel", () => {
  it("shows the failed session's review prompts and accessible evidence controls", () => {
    const markup = renderFixture(failureFixture, "ndjson");
    expect(markup).toContain("Trace findings");
    expect(markup).toContain("2 findings");
    expect(markup).toContain("Slow span: 428 ms");
    expect(markup).toContain("No completion signal recorded");
    expect(markup).toContain("Inspect event: Payment authorization request");
    expect(markup).toContain("They do not establish a root cause");
  });

  it("gives an honest empty state for a successful session", () => {
    const markup = renderFixture(successFixture, "json");
    expect(markup).toContain("No findings matched the current rules");
    expect(markup).toContain("This does not prove the journey succeeded");
    expect(markup).not.toContain("Inspect event");
  });

  it("does not show findings from a different selected session", () => {
    const result = parseTraceText(failureFixture, { format: "ndjson" });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const markup = renderToStaticMarkup(
      <FindingsPanel trace={result.trace} sessionId="other-session" onSelectEvent={() => {}} />,
    );
    expect(markup).toContain("0 findings");
    expect(markup).not.toContain("Slow span: 428 ms");
  });
});
