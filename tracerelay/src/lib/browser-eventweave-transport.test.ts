import { describe, expect, it, vi } from "vitest";
import { EVENTWEAVE_HANDOFF_MESSAGE_TYPE, EVENTWEAVE_HANDOFF_PROTOCOL_VERSION } from "./eventweave-handoff";
import {
  createBrowserEventWeaveTransport,
  EVENTWEAVE_ACK_MESSAGE_TYPE,
  EVENTWEAVE_READY_MESSAGE_TYPE,
  type HandoffBrowser,
  type HandoffPopup,
} from "./browser-eventweave-transport";

const message = {
  type: EVENTWEAVE_HANDOFF_MESSAGE_TYPE,
  protocolVersion: EVENTWEAVE_HANDOFF_PROTOCOL_VERSION,
  handoffId: "handoff-1",
  format: "json" as const,
  content: "{}",
};

const setup = () => {
  let listener: ((event: MessageEvent) => void) | undefined;
  const popup: HandoffPopup = { closed: false, close: vi.fn(), postMessage: vi.fn() };
  const browser: HandoffBrowser = {
    location: { origin: "http://127.0.0.1:4174" },
    open: vi.fn(() => popup),
    addEventListener: vi.fn((_type, next) => { listener = next; }),
    removeEventListener: vi.fn(),
    setTimeout: vi.fn(() => 1),
    clearTimeout: vi.fn(),
  };
  return { browser, popup, dispatch: (data: unknown, origin = "http://127.0.0.1:4175", source: unknown = popup) => listener?.({ data, origin, source } as MessageEvent) };
};

describe("local EventWeave browser transport", () => {
  it("waits for a same-popup, exact-origin ready message and resolves only after acknowledgement", async () => {
    const { browser, popup, dispatch } = setup();
    const transport = createBrowserEventWeaveTransport({ browser, eventWeaveUrl: "http://127.0.0.1:4175/" });
    const pending = transport.send(message, new AbortController().signal);

    dispatch({ type: EVENTWEAVE_READY_MESSAGE_TYPE, protocolVersion: 1, handoffId: "handoff-1" }, "http://attacker.test");
    expect(popup.postMessage).not.toHaveBeenCalled();
    dispatch({ type: EVENTWEAVE_READY_MESSAGE_TYPE, protocolVersion: 1, handoffId: "handoff-1" });
    expect(popup.postMessage).toHaveBeenCalledWith(message, "http://127.0.0.1:4175");
    dispatch({ type: EVENTWEAVE_ACK_MESSAGE_TYPE, protocolVersion: 1, handoffId: "handoff-1", accepted: true });

    await expect(pending).resolves.toBeUndefined();
  });

  it("reports a blocked popup without sending", async () => {
    const { browser } = setup();
    browser.open = vi.fn(() => null);
    const transport = createBrowserEventWeaveTransport({ browser, eventWeaveUrl: "http://127.0.0.1:4175/" });
    await expect(transport.send(message, new AbortController().signal)).rejects.toThrow("Allow pop-ups");
  });

  it("closes the pending local tab when cancelled", async () => {
    const { browser, popup } = setup();
    const controller = new AbortController();
    const transport = createBrowserEventWeaveTransport({ browser, eventWeaveUrl: "http://127.0.0.1:4175/" });
    const pending = transport.send(message, controller.signal);
    controller.abort();
    await expect(pending).rejects.toMatchObject({ name: "AbortError" });
    expect(popup.close).toHaveBeenCalled();
  });
});
