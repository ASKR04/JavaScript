import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";
import {
  HANDOFF_ACK_TYPE,
  HANDOFF_IMPORT_TYPE,
  HANDOFF_READY_TYPE,
  registerLocalHandoffReceiver,
} from "./local-handoff-receiver";

describe("local TraceRelay receiver", () => {
  it("announces readiness and accepts a valid exact-origin trace", () => {
    let listener: ((event: MessageEvent) => void) | undefined;
    const opener = { postMessage: vi.fn() };
    const browser = {
      location: { hash: "#tracerelayHandoff=handoff-1&sourceOrigin=http%3A%2F%2F127.0.0.1%3A4174" },
      opener,
      addEventListener: vi.fn((_type: string, next: (event: MessageEvent) => void) => { listener = next; }),
      removeEventListener: vi.fn(),
    };
    const onImport = vi.fn();
    registerLocalHandoffReceiver(browser as unknown as Window, onImport);
    expect(opener.postMessage).toHaveBeenCalledWith(expect.objectContaining({ type: HANDOFF_READY_TYPE, handoffId: "handoff-1" }), "http://127.0.0.1:4174");

    const content = readFileSync(new URL("../../public/samples/profile-save-failure.json", import.meta.url), "utf8");
    listener?.({
      origin: "http://127.0.0.1:4174",
      source: opener,
      data: { type: HANDOFF_IMPORT_TYPE, protocolVersion: 1, handoffId: "handoff-1", format: "json", content },
    } as unknown as MessageEvent);

    expect(onImport).toHaveBeenCalledWith(expect.objectContaining({ ok: true }), "tracerelay-handoff-1.json");
    expect(opener.postMessage).toHaveBeenLastCalledWith(expect.objectContaining({ type: HANDOFF_ACK_TYPE, accepted: true }), "http://127.0.0.1:4174");
  });

  it("ignores messages from another origin", () => {
    let listener: ((event: MessageEvent) => void) | undefined;
    const opener = { postMessage: vi.fn() };
    const browser = {
      location: { hash: "#tracerelayHandoff=handoff-1&sourceOrigin=http%3A%2F%2F127.0.0.1%3A4174" }, opener,
      addEventListener: vi.fn((_type: string, next: (event: MessageEvent) => void) => { listener = next; }), removeEventListener: vi.fn(),
    };
    const onImport = vi.fn();
    registerLocalHandoffReceiver(browser as unknown as Window, onImport);
    listener?.({ origin: "http://attacker.test", source: opener, data: {} } as unknown as MessageEvent);
    expect(onImport).not.toHaveBeenCalled();
  });
});
