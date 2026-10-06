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

/** True when every row's hash is the one its predecessor and its own fields give (the replay's "hashes match"). */
export function ledgerIntact(rows: readonly LedgerRow[]): boolean {
  let prev = GENESIS;
  return rows.every((r) => {
    const ok = r.prev === prev && r.hash === fnv(prev + r.seq + r.at + r.kind + r.text);
    prev = r.hash;
    return ok;
  });
}
