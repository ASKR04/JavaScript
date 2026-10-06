import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { App } from "./App";

describe("TraceRelay review interface", () => {
  it("renders an honest, accessible local-review boundary", () => {
    const html = renderToStaticMarkup(<App />);

    expect(html).toContain("Skip to capture review");
    expect(html).toContain('aria-label="Capture summary"');
    expect(html).toContain('aria-labelledby="sequence-title"');
    expect(html).toContain('aria-live="polite"');
    expect(html).toContain("Nothing exports before review.");
    expect(html).toContain("Download JSON");
    expect(html).toContain("disabled");
    expect(html).not.toContain("Start recording");
  });
});
