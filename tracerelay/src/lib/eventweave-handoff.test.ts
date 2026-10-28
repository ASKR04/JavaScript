import { describe, expect, it, vi } from "vitest";
import { createDemoCapture, recordProfileJourney } from "./demo-journey";
import {
  EventWeaveHandoffSession,
  prepareEventWeaveHandoff,
  validateEventWeaveHandoffMessage,
  type EventWeaveHandoffTransport,
} from "./eventweave-handoff";

const stoppedFailure = () => {
  const demo = createDemoCapture();
  demo.capture.start();
  recordProfileJourney(demo, "failure");
  demo.capture.stop();
  return demo.capture;
};

describe("EventWeave local handoff contract", () => {
  it("validates before preparation and discloses the exact protected payload", () => {
    const capture = stoppedFailure();
    const review = capture.toReview("Profile save failure");
    const prepared = prepareEventWeaveHandoff(capture, review, () => "handoff_demo");

    expect(prepared.disclosure).toMatchObject({
      traceId: review.traceId,
      sessionId: review.sessionId,
      eventCount: 6,
      removedAttributeCount: 1,
      maskedAttributeCount: 1,
    });
    expect(prepared.disclosure.actors).toEqual([
      "customer",
      "profile-api",
      "profile-form",
      "profile-page",
    ]);
    expect(prepared.disclosure.events[2].attributes.email).toBe("••••");
    expect(prepared.message.content).not.toContain("person@example.test");
    expect(prepared.message.content).not.toContain("synthetic-secret-that-must-not-survive");
    expect(validateEventWeaveHandoffMessage(prepared.message)).toMatchObject({
      ok: true,
      trace: { events: expect.arrayContaining([expect.objectContaining({ outcome: "failure" })]) },
    });
  });

  it("requires explicit confirmation before sending and completes once", async () => {
    const capture = stoppedFailure();
    const prepared = prepareEventWeaveHandoff(
      capture,
      capture.toReview("Profile save failure"),
      () => "handoff_confirm",
    );
    const send = vi.fn<EventWeaveHandoffTransport["send"]>().mockResolvedValue(undefined);
    const session = new EventWeaveHandoffSession(prepared);

    expect(send).not.toHaveBeenCalled();
    await expect(session.confirm({ send })).resolves.toMatchObject({ phase: "completed" });
    expect(send).toHaveBeenCalledOnce();
    expect(send.mock.calls[0]?.[0]).toEqual(prepared.message);
    await expect(session.confirm({ send })).rejects.toThrow("prepared or failed");
  });

  it("rejects a stale review before preparing any transferable content", () => {
    const capture = stoppedFailure();
    const staleReview = {
      ...capture.toReview("Different capture"),
      traceId: "trace_stale-review",
    };

    expect(() => prepareEventWeaveHandoff(capture, staleReview)).toThrow(
      "does not match the stopped trace",
    );
  });

  it("cancels an in-flight transfer without reporting success", async () => {
    const capture = stoppedFailure();
    const session = new EventWeaveHandoffSession(
      prepareEventWeaveHandoff(capture, capture.toReview("Profile save failure")),
    );
    const transport: EventWeaveHandoffTransport = {
      send: (_message, signal) =>
        new Promise((resolve, reject) => {
          signal.addEventListener("abort", () => reject(new DOMException("Cancelled", "AbortError")));
          void resolve;
        }),
    };

    const confirmation = session.confirm(transport);
    expect(session.state.phase).toBe("sending");
    expect(session.cancel().phase).toBe("cancelled");
    await expect(confirmation).resolves.toMatchObject({ phase: "cancelled" });
  });

  it("retains the reviewed payload after failure so a human can retry", async () => {
    const capture = stoppedFailure();
    const prepared = prepareEventWeaveHandoff(capture, capture.toReview("Profile save failure"));
    const session = new EventWeaveHandoffSession(prepared);
    const failed = await session.confirm({
      send: () => Promise.reject(new Error("EventWeave window closed before acknowledgement.")),
    });

    expect(failed).toMatchObject({
      phase: "failed",
      prepared,
      message: "EventWeave window closed before acknowledgement.",
    });
    expect(session.retry()).toMatchObject({ phase: "prepared", prepared });
  });

  it("rejects malformed and unsupported messages at the EventWeave boundary", () => {
    expect(validateEventWeaveHandoffMessage(null)).toEqual({
      ok: false,
      errors: ["The handoff message must be an object."],
    });
    expect(
      validateEventWeaveHandoffMessage({
        type: "tracerelay:eventweave-import",
        protocolVersion: 99,
        handoffId: "bad",
        format: "json",
        content: "{}",
      }),
    ).toEqual({ ok: false, errors: ["The handoff protocol version is unsupported."] });
  });
});
