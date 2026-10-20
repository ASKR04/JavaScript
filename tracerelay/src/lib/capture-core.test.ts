import { describe, expect, it } from "vitest";
import {
  CaptureCore,
  CaptureLimitError,
  CaptureStateError,
  CaptureValidationError,
} from "./capture-core";

function createHarness(options: ConstructorParameters<typeof CaptureCore>[0] = {}) {
  let now = 1_780_000_000_000;
  let id = 0;
  return {
    capture: new CaptureCore({
      now: () => now,
      createId: () => String(++id).padStart(3, "0"),
      ...options,
    }),
    advance(milliseconds: number) {
      now += milliseconds;
    },
  };
}

describe("CaptureCore lifecycle", () => {
  it("requires explicit start and stop boundaries", () => {
    const { capture } = createHarness();

    expect(() =>
      capture.record({ actor: "shopper", type: "user.action", message: "Save selected" }),
    ).toThrow(CaptureStateError);

    expect(capture.start()).toEqual({
      traceId: "trace_001",
      sessionId: "session_002",
      startedAt: "2026-05-28T20:26:40.000Z",
    });
    expect(() => capture.start()).toThrow(CaptureStateError);

    capture.stop();
    expect(capture.state).toBe("stopped");
    expect(() =>
      capture.record({ actor: "shopper", type: "user.action", message: "Late event" }),
    ).toThrow(CaptureStateError);
  });

  it("records ordered parent-linked events and produces deterministic EventWeave files", () => {
    const { capture, advance } = createHarness({
      privacy: { allowKeys: ["route", "status"] },
    });
    capture.start();
    const action = capture.record({
      actor: "customer",
      type: "user.action",
      message: "Save profile selected",
      outcome: "success",
      attributes: { route: "/profile" },
    });
    advance(125);
    const response = capture.record({
      actor: "profile-api",
      type: "network.response",
      message: "Profile update unavailable",
      outcome: "failure",
      durationMs: 125,
      parentId: action.id,
      attributes: { status: 503 },
    });
    capture.stop();

    const trace = capture.toEventWeaveTrace();
    expect(trace).toEqual({
      schemaVersion: "1.0",
      events: [
        expect.objectContaining({
          id: "event_003",
          sessionId: "session_002",
          type: "user.action",
          timestamp: "2026-05-28T20:26:40.000Z",
        }),
        expect.objectContaining({
          id: "event_004",
          parentId: "event_003",
          timestamp: "2026-05-28T20:26:40.125Z",
        }),
      ],
    });
    expect(response.offsetMs).toBe(125);
    expect(capture.toJson()).toBe(`${JSON.stringify(trace, null, 2)}\n`);
    expect(capture.toNdjson()).toBe(
      trace.events.map((event) => JSON.stringify(event)).join("\n") + "\n",
    );
  });

  it("rejects a parent that is not an earlier accepted event", () => {
    const { capture } = createHarness();
    capture.start();

    expect(() =>
      capture.record({
        actor: "profile-api",
        type: "network.response",
        message: "Response received",
        parentId: "event_missing",
      }),
    ).toThrow(CaptureValidationError);
    expect(capture.snapshot().events).toHaveLength(0);
  });

  it("seals exports behind a stopped, non-empty capture", () => {
    const { capture } = createHarness();
    capture.start();
    expect(() => capture.toEventWeaveTrace()).toThrow(CaptureStateError);
    capture.stop();
    expect(() => capture.toEventWeaveTrace()).toThrow(CaptureValidationError);
  });

  it("keeps returned snapshots isolated from the internal capture", () => {
    const { capture } = createHarness({ privacy: { allowKeys: ["route"] } });
    capture.start();
    const event = capture.record({
      actor: "profile-page",
      type: "ui.render",
      message: "Profile opened",
      attributes: { route: "/profile" },
    });

    (event.attributes as Record<string, string>).route = "/changed";
    expect(capture.snapshot().events[0]?.attributes.route).toBe("/profile");
  });
});

describe("CaptureCore privacy and bounds", () => {
  it("defaults to deny and never retains sensitive values even when allowed", () => {
    const { capture } = createHarness({
      privacy: {
        allowKeys: ["route", "email", "authorization", "cardNumber", "nested"],
        maskKeys: ["email"],
      },
    });
    capture.start();
    capture.record({
      actor: "profile-api",
      type: "network.request",
      message: "Profile update requested",
      attributes: {
        route: "/api/profile",
        email: "person@example.test",
        authorization: "Bearer never-store-this",
        cardNumber: "4111111111111111",
        note: "not approved",
        nested: { arbitrary: "DOM-like content" },
      },
    });

    const snapshot = capture.snapshot();
    expect(snapshot.events[0]?.attributes).toEqual({ email: "••••", route: "/api/profile" });
    expect(snapshot.events[0]?.reviewAttributes).toEqual([
      { key: "authorization", value: "Removed before review", treatment: "removed" },
      { key: "cardNumber", value: "Removed before review", treatment: "removed" },
      { key: "email", value: "••••", treatment: "masked" },
      { key: "nested", value: "Removed before review", treatment: "removed" },
      { key: "note", value: "Removed before review", treatment: "removed" },
      { key: "route", value: "/api/profile", treatment: "allowed" },
    ]);
    expect(JSON.stringify(snapshot)).not.toContain("never-store-this");
    expect(JSON.stringify(snapshot)).not.toContain("4111111111111111");
    expect(JSON.stringify(snapshot)).not.toContain("person@example.test");
    expect(JSON.stringify(snapshot)).not.toContain("DOM-like content");
  });

  it("rejects new events at the hard limit without evicting accepted parent evidence", () => {
    const { capture } = createHarness({ limits: { maxEvents: 1 } });
    capture.start();
    capture.record({ actor: "customer", type: "user.action", message: "Save selected" });

    expect(() =>
      capture.record({ actor: "profile-api", type: "network.request", message: "Request sent" }),
    ).toThrow(CaptureLimitError);
    expect(capture.snapshot()).toEqual(expect.objectContaining({
      events: [expect.objectContaining({ message: "Save selected" })],
      droppedEventCount: 1,
    }));
  });

  it("validates limits, event fields, and durations", () => {
    expect(() => new CaptureCore({ limits: { maxEvents: 20_001 } })).toThrow(
      CaptureValidationError,
    );
    const { capture } = createHarness();
    capture.start();
    expect(() =>
      capture.record({
        actor: " profile-api",
        type: "network.request",
        message: "Request sent",
      }),
    ).toThrow(CaptureValidationError);
    expect(() =>
      capture.record({
        actor: "profile-api",
        type: "network.request",
        message: "Request sent",
        durationMs: -1,
      }),
    ).toThrow(CaptureValidationError);
  });
});
