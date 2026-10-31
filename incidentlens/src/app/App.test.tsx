import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { App } from "./App";

describe("IncidentLens investigation workspace", () => {
  it("renders accessible evidence, uncertainty, and review-gated export boundaries", () => {
    const html = renderToStaticMarkup(<App />);
    expect(html).toContain("Skip to investigation");
    expect(html).toContain('id="investigation"');
    expect(html).toContain("Service path");
    expect(html).toContain("Evidence timeline");
    expect(html).toContain("Filter evidence sources");
    expect(html).toContain("Selected citation");
    expect(html).toContain("does not diagnose a root cause or assign blame");
    expect(html).toContain("Human-reviewed export");
    expect(html).toContain("Choose evidence without uploading it");
    expect(html).toContain("Choose synthetic JSON");
    expect(html).toContain('accept="application/json,.json"');
    expect(html).toContain("Nothing is uploaded");
    expect(html).toContain("Download reviewed report");
    expect(html).toContain("disabled");
    expect(html).toContain('role="status"');
  });
});
