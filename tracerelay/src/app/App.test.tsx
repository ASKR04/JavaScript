import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { App } from "./App";

describe("TraceRelay review interface", () => {
  it("renders explicit accessible capture controls and a locked export boundary", () => {
    const html = renderToStaticMarkup(<App />);

    expect(html).toContain("Skip to capture controls");
    expect(html).toContain('id="capture-controls"');
    expect(html).toContain("Start new capture");
    expect(html).toContain("Run success journey");
    expect(html).toContain("Run failure journey");
    expect(html).toContain("Stop and review");
    expect(html).toContain('role="status"');
    expect(html).toContain('aria-label="Capture summary"');
    expect(html).toContain('aria-labelledby="sequence-title"');
    expect(html).toContain('aria-live="polite"');
    expect(html).toContain("Nothing exports before review.");
    expect(html).toContain("Download reviewed JSON");
    expect(html).toContain("Download reviewed NDJSON");
    expect(html).toContain("disabled");
    expect(html).toContain("Recording is off");
    expect(html).toContain("No background recorder, automatic upload");
  });
});
