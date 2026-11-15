import type { EvidenceAdapter, EvidenceSource } from "./contracts";
/** In-memory adapter for public synthetic fixtures. It never opens a network connection. */
export class SyntheticEvidenceAdapter<T> implements EvidenceAdapter<T> {
  readonly source: EvidenceSource;
  readonly #records: readonly T[];
  constructor(source: EvidenceSource, records: readonly T[]) { this.source = source; this.#records = Object.freeze([...records]); }
  async load(): Promise<readonly T[]> { return this.#records; }
}
