// A poll's receipts on the Ladder: every class takes its own; a pending live revoke is settled only by a receipt that
// names its commit and a gated MR that read it, at the time the gate read it, with no simulated chip.
import { describe, expect, it } from 'vitest';
import { clockTime } from '../clock';
import type { ClassRow, EnforcementReceipt } from '../types';
import { applyReceipts } from './receipt';

const C1 = 'c1'.repeat(20);
const row = (id: string, pending: string | null = null): ClassRow => ({ id, track: 'T1', ceiling: 'hands_off', tier: 'supervised', lease_days: null, record: null, lastMove: 'revoked', pending });
const receipt = (o: Partial<EnforcementReceipt> = {}): EnforcementReceipt => ({
  commit: C1, committedAt: '2026-10-15T10:00:00.000Z', readIid: null, readAt: null, delaySec: null, withdrew: [], alarm: null, ...o,
});
const READ = { readIid: 45, readAt: '2026-10-15T10:01:30.000Z', delaySec: 90 };

describe('applyReceipts', () => {
  it('puts each class\'s receipt on it, and takes away one the poll no longer derives', () => {
    const r = receipt();
    const out = applyReceipts([{ ...row('a'), receipt: receipt({ commit: 'f'.repeat(40) }) }, row('b')], [], { b: r }, 'UTC');
    expect(out.classes.map((c) => c.receipt)).toEqual([undefined, r]);
    expect('receipt' in out.classes[0]!).toBe(false);
  });

  it('a pending revoke stays pending while the receipt names its commit but no gate read it, or names another commit', () => {
    for (const r of [receipt(), receipt({ commit: 'f'.repeat(40), ...READ })]) {
      const out = applyReceipts([row('a', C1.slice(0, 8))], [], { a: r }, 'UTC');
      expect(out.classes[0]?.pending).toBe(C1.slice(0, 8));
      expect(out.ledger).toEqual([]);
    }
  });

  it('is settled by a receipt that read its commit: one real entry, at the time the gate read it', () => {
    const out = applyReceipts([row('a', C1.slice(0, 8)), row('b')], [], { a: receipt(READ) }, 'UTC');
    expect(out.classes.map((c) => c.pending)).toEqual([null, null]);
    expect(out.ledger).toEqual([
      { at: Date.parse(READ.readAt), t: clockTime(Date.parse(READ.readAt), 'UTC'), ids: ['a'], actor: 'tier-gate job', where: 'GitLab', kind: 'gitlab', isNew: true, text: `!45's gate read tier-state.yml @ ${C1.slice(0, 8)}, 90 s after the commit` },
    ]);
    expect(out.classes[0]?.simRead).toBeUndefined();
  });

  it('the settle entry is the gate’s instant, labelled in the screen’s zone, not the process’s', () => {
    const readAt = '2026-10-15T12:01:30Z';
    const out = applyReceipts([row('a', '1a2b3c4d')], [], { a: receipt({ commit: '1a2b3c4d' + 'e'.repeat(32), readIid: 45, readAt, delaySec: 60 }) }, 'Europe/Prague');
    expect(out.ledger.at(-1)).toMatchObject({ at: Date.parse(readAt), t: '14:01:30' });
  });
});
