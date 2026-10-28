import type { EventWeaveHandoffMessage, EventWeaveHandoffTransport } from "./eventweave-handoff";

export const EVENTWEAVE_READY_MESSAGE_TYPE = "eventweave:handoff-ready" as const;
export const EVENTWEAVE_ACK_MESSAGE_TYPE = "eventweave:handoff-ack" as const;

type BrowserMessage = {
  type?: unknown;
  protocolVersion?: unknown;
  handoffId?: unknown;
  accepted?: unknown;
  message?: unknown;
};

export type HandoffPopup = {
  closed: boolean;
  close: () => void;
  postMessage: (message: unknown, targetOrigin: string) => void;
};

export type HandoffBrowser = {
  location: { origin: string };
  open: (url: string, target: string) => HandoffPopup | null;
  addEventListener: (type: "message", listener: (event: MessageEvent) => void) => void;
  removeEventListener: (type: "message", listener: (event: MessageEvent) => void) => void;
  setTimeout: (callback: () => void, delay: number) => number;
  clearTimeout: (handle: number) => void;
};

const isBrowserMessage = (value: unknown): value is BrowserMessage =>
  typeof value === "object" && value !== null && !Array.isArray(value);

export function createBrowserEventWeaveTransport({
  browser,
  eventWeaveUrl,
  timeoutMs = 8_000,
}: {
  browser: HandoffBrowser;
  eventWeaveUrl: string;
  timeoutMs?: number;
}): EventWeaveHandoffTransport {
  const target = new URL(eventWeaveUrl, browser.location.origin);
  if (target.protocol !== "http:" && target.protocol !== "https:") {
    throw new Error("EventWeave must use a local HTTP or HTTPS address.");
  }

  return {
    send(message: EventWeaveHandoffMessage, signal: AbortSignal): Promise<void> {
      return new Promise((resolve, reject) => {
        const fragment = new URLSearchParams({
          tracerelayHandoff: message.handoffId,
          sourceOrigin: browser.location.origin,
        });
        target.hash = fragment.toString();
        const popup = browser.open(target.toString(), "_blank");
        if (!popup) {
          reject(new Error("EventWeave could not open. Allow pop-ups for this local page and retry."));
          return;
        }

        let sent = false;
        const cleanup = () => {
          browser.clearTimeout(timeout);
          browser.removeEventListener("message", onMessage);
          signal.removeEventListener("abort", onAbort);
        };
        const fail = (error: Error) => {
          cleanup();
          if (!popup.closed) popup.close();
          reject(error);
        };
        const onAbort = () => fail(new DOMException("The local handoff was cancelled.", "AbortError"));
        const onMessage = (event: MessageEvent) => {
          if (event.origin !== target.origin || event.source !== popup || !isBrowserMessage(event.data)) return;
          if (event.data.handoffId !== message.handoffId || event.data.protocolVersion !== message.protocolVersion) return;
          if (event.data.type === EVENTWEAVE_READY_MESSAGE_TYPE && !sent) {
            sent = true;
            popup.postMessage(message, target.origin);
            return;
          }
          if (event.data.type !== EVENTWEAVE_ACK_MESSAGE_TYPE || !sent) return;
          cleanup();
          if (event.data.accepted === true) resolve();
          else reject(new Error(typeof event.data.message === "string" ? event.data.message : "EventWeave rejected the trace."));
        };
        const timeout = browser.setTimeout(
          () => fail(new Error("EventWeave did not acknowledge the local handoff. Retry or download a file instead.")),
          timeoutMs,
        );
        browser.addEventListener("message", onMessage);
        signal.addEventListener("abort", onAbort, { once: true });
        if (signal.aborted) onAbort();
      });
    },
  };
}

export function defaultEventWeaveUrl(location: Location): string {
  return location.hostname === "localhost" || location.hostname === "127.0.0.1"
    ? `${location.protocol}//${location.hostname}:4175/`
    : new URL("../eventweave/", location.href).toString();
}
