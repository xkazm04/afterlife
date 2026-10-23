// The desk's rows: every inbox kind and every decided item becomes a row, with its write or why it is read-only here.
import { describe, expect, it } from 'vitest';
import type { NeedsYouItem } from '@/lib/demo';
import type { DecidedItem } from '@/server/data/types';
import { elsewhere, liveIntent } from '../live';
import { deadlineOf, deskItems } from '.';

const NOW = new Date('2026-10-23T10:00:00Z');
const promote: NeedsYouItem = { id: 'promote:p:qa.file-bug', kind: 'promote', title: 'Promote T7 qa · qa.file-bug', to: 'hands_off', does: 'd' };
const readmit: NeedsYouItem = { id: 'readmit:p:patch-bump', kind: 'readmit', title: 'Re-admit T8 gardener · patch-bump', does: 'd' };
const gap: NeedsYouItem = {
  id: 'gap:p:secure', kind: 'gaps', title: 'Secure: enforce SAST', does: 'd', stage: 'secure', rungFrom: 1, rungTo: 2,
  change: 'add the SAST include', template: 'secure-includes',
};
const handGap: NeedsYouItem = { id: 'gap:p:monitor', kind: 'gaps', title: 'Monitor', does: 'd', stage: 'monitor', rungFrom: null, rungTo: 1, change: 'wire an alert route by hand', template: null };
const parent: NeedsYouItem = { id: 'n3', kind: 'gaps', title: 'Maturity gaps', does: 'd', count: 3 };
const signoff: NeedsYouItem = { id: 'n2', kind: 'signoff', title: 'CRA sign-off', does: 'd', dueIn: '3 h 12 m' };
const setup: NeedsYouItem = { id: 'n5', kind: 'setup', title: 'Runner gate', does: 'd' };
const acted: DecidedItem = { id: 'd1', kind: 'promote', project: 'p', title: 'Promote x', actedAt: '2026-10-22T09:00:00Z', actedAs: 'ops' };

const rows = deskItems([promote, readmit, gap, handGap, parent, signoff, setup], [acted], 'p', NOW);
const row = (id: string) => rows.find((n) => n.id === id)!;

describe('deskItems', () => {
  it('maps every kind and drops nothing; a decided row carries when and by whom', () => {
    expect(rows.map((n) => [n.id, n.kind])).toEqual([
      [promote.id, 'promote'], [readmit.id, 'readmit'], [gap.id, 'gap'], [handGap.id, 'gap'], ['n3', 'gap'], ['n2', 'other'], ['n5', 'other'], ['d1', 'decided'],
    ]);
    expect(row('d1')).toMatchObject({ actedAt: acted.actedAt, actedAs: 'ops', decided: acted, source: null, intent: null, readOnly: null, project: 'p' });
    expect(row(promote.id)).toMatchObject({ actedAt: null, actedAs: null, decided: null, source: promote, project: 'p' });
  });

  it('no opened time is invented: a row without one starts unknown, one the server sent is kept', () => {
    expect(rows.every((n) => n.openedAt === null)).toBe(true);
    const at = '2026-10-21T08:00:00.000Z';
    expect(deskItems([{ ...promote, openedAt: at }], [], 'p', NOW)[0]?.openedAt).toBe(at);
  });

  it('a promotion and a re-admit carry exactly the write liveIntent builds', () => {
    expect(row(promote.id).intent).toEqual(liveIntent(promote, 'p'));
    expect(row(readmit.id).intent).toEqual(liveIntent(readmit, 'p'));
    expect(row(readmit.id).readOnly).toBeNull();
  });

  it('a gap with a template previews its draft MR with the exact fields', () => {
    expect(row(gap.id).intent).toEqual({ kind: 'apply-gap-template', project: 'p', proposal: gap.id, stage: 'secure', from: 1, to: 2, template: 'secure-includes' });
    expect(row(gap.id).readOnly).toBeNull();
    const unknownFrom = deskItems([{ ...gap, rungFrom: undefined }], [], 'p', NOW)[0];
    expect(unknownFrom?.intent).toMatchObject({ from: null });
  });

  it('a gap without a template is read-only and names its change; a gap whose template is unknown sends nothing either', () => {
    expect(row(handGap.id)).toMatchObject({ intent: null, readOnly: 'Read-only here: wire an alert route by hand' });
    expect(deskItems([{ ...gap, template: 'rm-rf' }], [], 'p', NOW)[0]?.intent).toBeNull();
  });

  it('a seeded gaps parent, a sign-off and a setup step are read-only with the existing copy', () => {
    expect(row('n3')).toMatchObject({ intent: null, readOnly: elsewhere('gaps') });
    expect(row('n2')).toMatchObject({ intent: null, readOnly: elsewhere('signoff') });
    expect(row('n5')).toMatchObject({ intent: null, readOnly: elsewhere('setup') });
  });

  it('the deadline comes from the countdown', () => {
    expect(row('n2').group.deadline).toBe('today');
    expect(row('n5').group.deadline).toBe('none');
  });
});

describe('deadlineOf', () => {
  it('none without a countdown, overdue when it says so, today within the UTC day, later beyond it', () => {
    expect(deadlineOf(undefined, NOW)).toBe('none');
    expect(deadlineOf('overdue', NOW)).toBe('overdue');
    expect(deadlineOf('45 m', NOW)).toBe('today');
    expect(deadlineOf('13 h 59 m', NOW)).toBe('today');
    expect(deadlineOf('14 h 0 m', NOW)).toBe('later');
    expect(deadlineOf('50 h 3 m', NOW)).toBe('later');
  });

  it('an unreadable countdown is a deadline still: it sorts as today, never as none', () => {
    expect(deadlineOf('soon', NOW)).toBe('today');
  });
});
