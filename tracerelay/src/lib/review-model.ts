export type CaptureOutcome = "success" | "failure" | "unknown";

export type ReviewAttribute = {
  key: string;
  value: string;
  treatment: "allowed" | "masked" | "removed";
};

export type ReviewEvent = {
  id: string;
  parentId?: string;
  offsetMs: number;
  durationMs?: number;
  actor: string;
  type: string;
  name: string;
  outcome: CaptureOutcome;
  attributes: ReviewAttribute[];
};

export type CaptureReview = {
  name: string;
  traceId: string;
  sessionId: string;
  events: ReviewEvent[];
};

export type CaptureSummary = {
  eventCount: number;
  actorCount: number;
  typeCount: number;
  protectedFieldCount: number;
};

export function summarizeCapture(review: CaptureReview): CaptureSummary {
  const actors = new Set(review.events.map((event) => event.actor));
  const types = new Set(review.events.map((event) => event.type));
  const protectedFieldCount = review.events.reduce(
    (count, event) =>
      count + event.attributes.filter((attribute) => attribute.treatment !== "allowed").length,
    0,
  );

  return {
    eventCount: review.events.length,
    actorCount: actors.size,
    typeCount: types.size,
    protectedFieldCount,
  };
}

export const profileSaveReview: CaptureReview = {
  name: "Profile save — service unavailable",
  traceId: "trace_profile_demo_01",
  sessionId: "session_profile_demo_01",
  events: [
    {
      id: "profile-opened",
      offsetMs: 0,
      actor: "profile-page",
      type: "render",
      name: "Profile editor opened",
      outcome: "success",
      attributes: [{ key: "route", value: "/profile", treatment: "allowed" }],
    },
    {
      id: "save-requested",
      parentId: "profile-opened",
      offsetMs: 184,
      actor: "customer",
      type: "action",
      name: "Save profile selected",
      outcome: "success",
      attributes: [{ key: "control", value: "save-profile", treatment: "allowed" }],
    },
    {
      id: "update-started",
      parentId: "save-requested",
      offsetMs: 192,
      actor: "profile-form",
      type: "state",
      name: "Profile update started",
      outcome: "unknown",
      attributes: [
        { key: "fieldCount", value: "3", treatment: "allowed" },
        { key: "email", value: "••••@example.test", treatment: "masked" },
      ],
    },
    {
      id: "request-sent",
      parentId: "update-started",
      offsetMs: 205,
      durationMs: 445,
      actor: "profile-api",
      type: "request",
      name: "Profile update request sent",
      outcome: "unknown",
      attributes: [
        { key: "method", value: "PATCH", treatment: "allowed" },
        { key: "route", value: "/api/profile", treatment: "allowed" },
        { key: "authorization", value: "Removed before review", treatment: "removed" },
      ],
    },
    {
      id: "response-failed",
      parentId: "request-sent",
      offsetMs: 650,
      durationMs: 2,
      actor: "profile-api",
      type: "response",
      name: "Profile update failed: service unavailable",
      outcome: "failure",
      attributes: [
        { key: "status", value: "503", treatment: "allowed" },
        { key: "retryable", value: "true", treatment: "allowed" },
      ],
    },
    {
      id: "banner-rendered",
      parentId: "response-failed",
      offsetMs: 664,
      actor: "profile-page",
      type: "render",
      name: "Could not save profile banner displayed",
      outcome: "success",
      attributes: [{ key: "messageKey", value: "profile.save.unavailable", treatment: "allowed" }],
    },
  ],
};
