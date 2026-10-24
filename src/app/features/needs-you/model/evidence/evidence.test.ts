// The class behind a live promotion or re-admit, as it is now, beside Run: the outputs behind its counts, the gate, the
// trigger, and whether the class moved since the proposal was opened (then Run is closed).
import { describe, expect, it } from 'vitest';
import type { ActionClass, NeedsYouItem } from '@/lib/demo';
import type { CountedOutput, RecordSources } from '@/lib/demo/sources';
import { displayLastMove } from '@/lib/promotion/trigger/trigger';
import { liveEvidence } from './evidence';

const promote: NeedsYouItem = {
  id: 'promote:ledgerline:code-fix.patch', kind: 'promote', title: 'Promote T1 patcher · code-fix.patch', from: 'supervised', to: 'hands_off',
  rules: [['accepted outputs', '7 / 5', true]], does: 'Opens a policy MR in belay-policy.',
};
const readmit: NeedsYouItem = { id: 'readmit:ledgerline:qa.file-bug', kind: 'readmit', title: 'Re-admit T7 qa · qa.file-bug', does: 'Re-admits at Assisted at most.' };

const out = (iid: number, day: number): CountedOutput => ({
  iid, outcome: 'merged', at: `2026-10-${String(day).padStart(2, '0')}T10:00:00Z`, inWindow: true, edited: iid === 7, gated: iid === 6,
});
// seven counted outputs, listed oldest first on purpose: the evidence orders them itself
const sources: RecordSources = {
  since: '2026-09-01T00:00:00Z', window: null, web: 'https://gitlab.com/acme/ll', total: 7, excluded: [], blocks: [], missing: [],
  outputs: [1, 2, 3, 4, 5, 6, 7].map((i) => out(i, i)),
};
const cls = (over: Partial<ActionClass> = {}): ActionClass => ({
  id: 'code-fix.patch', track: 'T1', ceiling: 'hands_off', tier: 'supervised', lease_days: null, lastMove: '3 d ago · promoted',
  record: { accepted: 7, needed: 5, noEdit: 6, cleanDays: 14, reverts: 0 }, sources, gateSeen: null, since: '2026-09-01T00:00:00Z', ...over,
});

describe('liveEvidence', () => {
  it('a promotion whose class has not moved: the five newest counted outputs with their MR links, how many more, Run open', () => {
    const e = liveEvidence(promote, cls(), null);
    if (e.kind !== 'class') throw new Error('expected the class');
    expect(e.outputs).toHaveLength(5);
    expect(e.outputs.map((o) => o.iid)).toEqual([7, 6, 5, 4, 3]);
    expect(e.outputs[0]!.href).toBe('https://gitlab.com/acme/ll/-/merge_requests/7');
    expect(e.more).toBe(2);
    expect(e.moved).toBeNull();
    expect(e.canRun).toBe(true);
  });

  it('a promotion whose class was quarantined since: moved, Run closed, and the line names the tier now', () => {
    const e = liveEvidence(promote, cls({ tier: 'quarantined' }), null);
    if (e.kind !== 'class') throw new Error('expected the class');
    expect(e.moved).toEqual({ from: 'supervised', now: 'quarantined' });
    expect(e.canRun).toBe(false);
    expect(e.movedLine).toContain('Quarantined');
  });

  it('a re-admit of a class still quarantined: the trigger that fired, worded as the Ladder words it, Run open', () => {
    const lastMove = '4 min ago · tripwire · guardrail_high';
    const e = liveEvidence(readmit, cls({ id: 'qa.file-bug', tier: 'quarantined', lastMove }), null);
    if (e.kind !== 'class') throw new Error('expected the class');
    expect(e.trigger).toBe(displayLastMove(lastMove));
    expect(e.moved).toBeNull();
    expect(e.canRun).toBe(true);
  });

  it('a re-admit of a class already re-admitted (Assisted now): moved, Run closed', () => {
    const e = liveEvidence(readmit, cls({ id: 'qa.file-bug', tier: 'assisted' }), null);
    if (e.kind !== 'class') throw new Error('expected the class');
    expect(e.moved).toEqual({ from: 'quarantined', now: 'assisted' });
    expect(e.canRun).toBe(false);
  });

  it('a class the index does not hold says so: no record, no outputs invented', () => {
    const e = liveEvidence(promote, undefined, null);
    if (e.kind !== 'missing') throw new Error('expected the missing class');
    expect(e.line).toContain('not in the index');
    expect(e).not.toHaveProperty('outputs');
    expect(e).not.toHaveProperty('record');
  });

  it('a class with no sources and no gate read: no outputs, a "not listed" line, and no gate line', () => {
    const e = liveEvidence(promote, cls({ sources: null, gateSeen: undefined }), null);
    if (e.kind !== 'class') throw new Error('expected the class');
    expect(e.outputs).toEqual([]);
    expect(e.outputsLine).toContain('not listed');
    expect(e.gate).toBeNull();
  });
});

describe('liveEvidence on an unreadable from', () => {
  it('a from that is no tier (even an Object prototype key) is not a move: Run stays open, no moved line', () => {
    for (const from of ['garbage', 'toString', 'constructor']) {
      const e = liveEvidence({ ...promote, from: from as NeedsYouItem['from'] }, cls(), null);
      if (e.kind !== 'class') throw new Error('expected the class');
      expect(e.moved).toBeNull();
      expect(e.canRun).toBe(true);
    }
  });
});
