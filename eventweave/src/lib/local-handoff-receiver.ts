import { parseTraceText, type TraceImportResult } from "./trace-parser";

export const HANDOFF_PROTOCOL_VERSION = 1 as const;
export const HANDOFF_IMPORT_TYPE = "tracerelay:eventweave-import" as const;
export const HANDOFF_READY_TYPE = "eventweave:handoff-ready" as const;
export const HANDOFF_ACK_TYPE = "eventweave:handoff-ack" as const;

type ReceiverWindow = Pick<Window, "location" | "opener" | "addEventListener" | "removeEventListener">;

const record = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

export function registerLocalHandoffReceiver(
  browser: ReceiverWindow,
  onImport: (result: TraceImportResult, fileName: string) => void,
): () => void {
  const params = new URLSearchParams(browser.location.hash.slice(1));
  const handoffId = params.get("tracerelayHandoff");
  const sourceOrigin = params.get("sourceOrigin");
  const opener = browser.opener as WindowProxy | null;
  if (!handoffId || !sourceOrigin || !opener) return () => undefined;

  const reply = (accepted: boolean, message?: string) =>
    opener.postMessage(
      { type: HANDOFF_ACK_TYPE, protocolVersion: HANDOFF_PROTOCOL_VERSION, handoffId, accepted, message },
      sourceOrigin,
    );
  const onMessage = (event: MessageEvent) => {
    if (event.origin !== sourceOrigin || event.source !== opener || !record(event.data)) return;
    if (
      event.data.type !== HANDOFF_IMPORT_TYPE ||
      event.data.protocolVersion !== HANDOFF_PROTOCOL_VERSION ||
      event.data.handoffId !== handoffId ||
      event.data.format !== "json" ||
      typeof event.data.content !== "string"
    ) return;
    const result = parseTraceText(event.data.content, { format: "json", importedAt: new Date().toISOString() });
    onImport(result, `tracerelay-${handoffId}.json`);
    reply(result.ok, result.ok ? undefined : result.errors.map(({ message }) => message).join(" "));
  };
  browser.addEventListener("message", onMessage);
  opener.postMessage(
    { type: HANDOFF_READY_TYPE, protocolVersion: HANDOFF_PROTOCOL_VERSION, handoffId },
    sourceOrigin,
  );
  return () => browser.removeEventListener("message", onMessage);
}
