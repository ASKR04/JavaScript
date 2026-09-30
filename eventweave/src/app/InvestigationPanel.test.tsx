import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import type { InvestigationService } from "../lib/investigation-service";
import { parseTraceText } from "../lib/trace-parser";
import { InvestigationPanel } from "./InvestigationPanel";

const fixture = readFileSync(new URL("../../public/samples/checkout-failure.ndjson", import.meta.url), "utf8");

const service: InvestigationService = {
  save: async () => ({ ok: false, errors: [] }),
  list: async () => ({ ok: true, value: [] }),
  restore: async () => ({ ok: false, errors: [] }),
  remove: async () => ({ ok: true, value: undefined }),
};

describe("InvestigationPanel", () => {
  it("exposes local-only save and restore controls with an announced status", () => {
    const parsed = parseTraceText(fixture, { format: "ndjson" });
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;

    const markup = renderToStaticMarkup(
      <InvestigationPanel
        service={service}
        trace={parsed.trace}
        sessionId="checkout-failure"
        eventId="failure-003"
        filters={{ actor: "checkout-api", type: "network.request", outcome: "failure", minimumDurationMs: 400 }}
        onRestore={() => undefined}
      />,
    );

    expect(markup).toContain("Save this exact debugging context");
    expect(markup).toMatch(/<label for="[^"]+">Investigation name<\/label>/);
    expect(markup).toContain("Save locally");
    expect(markup).toContain("Nothing saved for this trace");
    expect(markup).toContain("Captures the selected session, event, and filters—not imported trace contents.");
    expect(markup).toMatch(/<p[^>]+role="status"[^>]+aria-live="polite"/);
    expect(markup).toMatch(/<button[^>]+disabled=""[^>]*>Restore<\/button>/);
    expect(markup).toMatch(/<button[^>]+disabled=""[^>]*>Remove<\/button>/);
  });
});
