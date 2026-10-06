// Pure hash-chain checks over the types and hash function in src/schemas/ledger.ts. No IO.
import { GENESIS, hashEvent, type LedgerEvent } from '@/schemas/ledger';

export class LedgerChainError extends Error {
  constructor(
    /** The seq of the first event that does not link. */
    readonly brokenAtSeq: number,
    reason: string,
  ) {
    super(`ledger chain rejected at seq ${brokenAtSeq}: ${reason}`);
    this.name = 'LedgerChainError';
  }
}

export interface ChainTail {
  seq: number;
  hash: string;
}

/**
 * Checks that `events` extend `tail` (null = a new chain) one link at a time: consecutive seq, prev_hash equal to
 * the previous hash, and every hash recomputed. Throws LedgerChainError at the first bad event.
 */
export function assertExtends(tail: ChainTail | null, events: readonly LedgerEvent[]): void {
  let prev = tail ?? { seq: 0, hash: GENESIS };
  for (const e of events) {
    if (e.seq !== prev.seq + 1) throw new LedgerChainError(e.seq, `expected seq ${prev.seq + 1}`);
    if (e.prev_hash !== prev.hash) throw new LedgerChainError(e.seq, 'prev_hash does not match the previous event');
    const { hash, ...body } = e;
    if (hashEvent(body) !== hash) throw new LedgerChainError(e.seq, 'hash does not match the event content');
    prev = { seq: e.seq, hash };
  }
}
