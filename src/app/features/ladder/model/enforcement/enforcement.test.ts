// The class page's "Enforced" card: three facts and an alarm from the live receipt, what is known of a revoke still
// pending, and the demo's simulated read, every fact of it marked simulated. Nothing to say: no card.
import { describe, expect, it } from 'vitest';
import type { ClassRow, EnforcementReceipt } from '../types';
import { enforcementOf } from './enforcement';

const C1 = 'c1'.repeat(20);
const row = (o: Partial<ClassRow> = {}): ClassRow => ({ id: 'a', track: 'T1', ceiling: 'hands_off', tier: 'supervised', lease_days: null, record: null, lastMove: '', pending: null, ...o });
const receipt = (o: Partial<EnforcementReceipt> = {}): EnforcementReceipt => ({
  commit: C1, committedAt: '2026-10-15T10:00:00.000Z', readIid: null, readAt: null, delaySec: null, withdrew: [], alarm: null, ...o,
});
const texts = (c: ClassRow, live = true) => enforcementOf(c, live)?.facts.map((f) => `${f.label}: ${f.text}`);

describe('enforcementOf', () => {
  it('no receipt, nothing pending, nothing settled: nothing to say', () => {
    expect(enforcementOf(row(), true)).toBeNull();
    expect(enforcementOf(row({ receipt: receipt() }), false)).toBeNull(); // demo never reads a receipt
  });

  it('live: committed, awaiting the next gated MR', () => {
    expect(texts(row({ receipt: receipt() }))).toEqual([`Committed: ${C1.slice(0, 8)}`, 'Read: awaiting the next gated MR', 'Withdrawn: nothing']);
  });

  it('live: read at !N with the delay, every withdrawal, and the alarm', () => {
    const r = receipt({
      readIid: 45, readAt: '2026-10-15T10:03:00.000Z', delaySec: 180,
      withdrew: [{ what: 'approval', iid: 45, at: '' }, { what: 'auto_merge', iid: 47, at: '' }], alarm: { iid: 46, tier: 'hands_off', at: '' },
    });
    const e = enforcementOf(row({ receipt: r }), true);
    expect(e?.facts.map((f) => f.text)).toEqual([C1.slice(0, 8), 'at !45, 3 min after the commit', 'approval on !45 · auto-merge on !47']);
    expect([e?.alarm, e?.simulated]).toEqual(["!46's gate granted Hands-off after the commit", false]);
  });

  it('a revoke pending on a receipt of the record before it: only the commit, awaiting', () => {
    expect(texts(row({ pending: 'e7f1a2b3', receipt: receipt() }))).toEqual(['Committed: e7f1a2b3', 'Read: awaiting the next gated MR', 'Withdrawn: nothing yet']);
    expect(enforcementOf(row({ pending: 'e7f1' }), false)?.simulated).toBe(true);
    expect(enforcementOf(row({ pending: 'e7f1a2b3' }), true)?.simulated).toBe(false);
  });

  it('demo: the simulated read and withdrawal, marked simulated', () => {
    const e = enforcementOf(row({ simRead: { sha: 'e7f1', t: '14:24:36' } }), false);
    expect(e?.facts.map((f) => f.text)).toEqual(['e7f1', 'by the next MR pipeline at 14:24:36', 'the approval the old tier had granted an open MR']);
    expect(e?.simulated).toBe(true);
  });
});
