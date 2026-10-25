import { CaptureCore, type ProtectedCaptureEvent } from "./capture-core";

export type ProfileJourneyOutcome = "success" | "failure";

export type DemoCapture = {
  capture: CaptureCore;
  advance: (milliseconds: number) => void;
};

const demoPrivacyPolicy = {
  allowKeys: [
    "route",
    "control",
    "fieldCount",
    "email",
    "method",
    "status",
    "retryable",
    "messageKey",
  ],
  maskKeys: ["email"],
} as const;

export function createDemoCapture(): DemoCapture {
  let now = Date.parse("2026-10-20T14:00:00.000Z");
  let sequence = 0;

  return {
    capture: new CaptureCore({
      privacy: demoPrivacyPolicy,
      limits: { maxEvents: 12 },
      now: () => now,
      createId: () => `demo-${String(++sequence).padStart(3, "0")}`,
    }),
    advance(milliseconds: number) {
      now += milliseconds;
    },
  };
}

export function recordProfileJourney(
  demo: DemoCapture,
  outcome: ProfileJourneyOutcome,
): readonly ProtectedCaptureEvent[] {
  const recorded: ProtectedCaptureEvent[] = [];
  const append = (event: Parameters<CaptureCore["record"]>[0]) => {
    const captured = demo.capture.record(event);
    recorded.push(captured);
    return captured;
  };

  const opened = append({
    actor: "profile-page",
    type: "ui.render",
    message: "Profile editor opened",
    outcome: "success",
    attributes: { route: "/profile" },
  });
  demo.advance(184);
  const selected = append({
    actor: "customer",
    type: "user.action",
    message: "Save profile selected",
    outcome: "success",
    parentId: opened.id,
    attributes: { control: "save-profile" },
  });
  demo.advance(8);
  const started = append({
    actor: "profile-form",
    type: "state.transition",
    message: "Profile update started",
    parentId: selected.id,
    attributes: { fieldCount: 3, email: "person@example.test" },
  });
  demo.advance(13);
  const request = append({
    actor: "profile-api",
    type: "network.request",
    message: "Profile update request sent",
    durationMs: outcome === "failure" ? 445 : 188,
    parentId: started.id,
    attributes: {
      method: "PATCH",
      route: "/api/profile",
      authorization: "Bearer synthetic-secret-that-must-not-survive",
    },
  });
  demo.advance(outcome === "failure" ? 445 : 188);
  const response = append({
    actor: "profile-api",
    type: "network.response",
    message:
      outcome === "failure"
        ? "Profile update failed: service unavailable"
        : "Profile update completed",
    outcome,
    durationMs: 2,
    parentId: request.id,
    attributes: { status: outcome === "failure" ? 503 : 200, retryable: outcome === "failure" },
  });
  demo.advance(14);
  append({
    actor: "profile-page",
    type: "ui.render",
    message:
      outcome === "failure"
        ? "Could not save profile banner displayed"
        : "Profile saved confirmation displayed",
    outcome: "success",
    parentId: response.id,
    attributes: {
      messageKey:
        outcome === "failure" ? "profile.save.unavailable" : "profile.save.complete",
    },
  });

  return recorded;
}
