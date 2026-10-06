import { describe, expect, it } from 'vitest';
import { GENESIS, chainLedger, fnv, ledgerIntact } from './ledger';

const SEEDS = [
  [1, '09:00', 'task_started', 'a'],
  [2, '09:05', 'outcome', 'b'],
] as const;

describe('ledger chain', () => {
  it('hashes deterministically to 8 hex digits', () => {
    expect(fnv('belay')).toBe(fnv('belay'));
    expect(fnv('belay')).toMatch(/^[0-9a-f]{8}$/);
    expect(fnv('belay')).not.toBe(fnv('belaz'));
  });

  it('links each row to the previous hash, starting at the genesis', () => {
    const rows = chainLedger(SEEDS);
    expect(rows[0]?.prev).toBe(GENESIS);
    expect(rows[1]?.prev).toBe(rows[0]?.hash);
    expect(rows[0]?.seq).toBe(1);
  });

  it('detects a changed row', () => {
    const rows = chainLedger(SEEDS);
    expect(ledgerIntact(rows)).toBe(true);
    const first = rows[0];
    if (!first) throw new Error('no rows');
    expect(ledgerIntact([{ ...first, text: 'changed' }, ...rows.slice(1)])).toBe(false);
  });
});
