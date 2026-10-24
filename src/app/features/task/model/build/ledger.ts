import type { LedgerRow, LedgerSeed } from '../types';

/** FNV-1a over the string, as 8 hex digits. Illustrative stand-in for the ledger's real hash. */
export function fnv(s: string): string {
  let h = 2166136261;
  for (const c of s) {
    h ^= c.charCodeAt(0);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(16).padStart(8, '0');
}

export const GENESIS = '00000000';

/** Chain the rows: each hash covers the previous hash plus the row, so a changed row breaks every hash after it. */
export function chainLedger(seeds: readonly LedgerSeed[]): LedgerRow[] {
  let prev = GENESIS;
  return seeds.map(([seq, at, kind, text]) => {
    const hash = fnv(prev + seq + at + kind + text);
    const row: LedgerRow = { seq, at, kind, text, prev, hash };
    prev = hash;
    return row;
  });
}

/** The seq of the first illustrative (FNV) row whose hash is not the one its predecessor and its own fields give, or null. */
export function firstBrokenSeq(rows: readonly LedgerRow[]): number | null {
  let prev = GENESIS;
  for (const r of rows) {
    if (r.prev !== prev || r.hash !== fnv(prev + r.seq + r.at + r.kind + r.text)) return r.seq;
    prev = r.hash;
  }
  return null;
}
