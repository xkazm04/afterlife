// The desk's table: three groupings, decided rows always last and newest first, oldest open rows first; and the summary.
import { describe, expect, it } from 'vitest';
import type { NeedsKind } from '@/lib/demo';
import { groupDesk, summarize, type Deadline, type DeskItem, type DeskKind } from '.';

const row = (id: string, kind: DeskKind, o: { project?: string; deadline?: Deadline; openedAt?: string | null; actedAt?: string; title?: string; src?: NeedsKind } = {}): DeskItem => ({
  id, kind, project: o.project ?? 'a', title: o.title ?? id, openedAt: o.openedAt ?? null, actedAt: o.actedAt ?? null, actedAs: null,
  group: { kind, project: o.project ?? 'a', deadline: o.deadline ?? 'none' }, intent: null, readOnly: null,
  source: kind === 'decided' ? null : { id, kind: o.src ?? (kind === 'gap' ? 'gaps' : kind === 'other' ? 'setup' : kind), title: id, does: 'd' }, decided: null,
});

const items: DeskItem[] = [
  row('setup', 'other', { project: 'b', src: 'setup' }),
  row('sign', 'other', { project: 'a', src: 'signoff', deadline: 'overdue' }),
  row('gap', 'gap', { project: 'b', deadline: 'later' }),
  row('re', 'readmit', { project: 'a', deadline: 'today' }),
  row('pro-z', 'promote', { title: 'z' }),
  row('pro-old', 'promote', { openedAt: '2026-10-20T08:00:00Z', title: 'y' }),
  row('pro-new', 'promote', { openedAt: '2026-10-21T08:00:00Z', title: 'x' }),
  row('pro-a', 'promote', { title: 'a' }),
  row('d-old', 'decided', { actedAt: '2026-10-20T00:00:00Z' }),
  row('d-new', 'decided', { actedAt: '2026-10-22T00:00:00Z' }),
];
const shape = (by: Parameters<typeof groupDesk>[1], list = items) => groupDesk(list, by).map((g) => [g.name, g.items.map((n) => n.id)]);

describe('groupDesk', () => {
  it('by kind: promote, readmit, gap, then the read-only kinds; decided last, newest first', () => {
    expect(shape('kind')).toEqual([
      ['Extend trust', ['pro-old', 'pro-new', 'pro-a', 'pro-z']],
      ['Re-admit', ['re']],
      ['Maturity gaps', ['gap']],
      ['CRA sign-off', ['sign']],
      ['Setup', ['setup']],
      ['Decided this week', ['d-new', 'd-old']],
    ]);
  });

  it('by project: one group per project, by name, decided last', () => {
    expect(shape('project')).toEqual([
      ['a', ['pro-old', 'pro-new', 'pro-a', 're', 'sign', 'pro-z']],
      ['b', ['gap', 'setup']],
      ['Decided this week', ['d-new', 'd-old']],
    ]);
  });

  it('by deadline: overdue, today, later, none; within a group oldest first, unknown last, then title', () => {
    expect(shape('deadline')).toEqual([
      ['Overdue', ['sign']],
      ['Due today', ['re']],
      ['Due later', ['gap']],
      ['No deadline · oldest first', ['pro-old', 'pro-new', 'pro-a', 'setup', 'pro-z']],
      ['Decided this week', ['d-new', 'd-old']],
    ]);
  });

  it('empty groups are omitted, the decided group too', () => {
    expect(shape('kind', [row('re', 'readmit')])).toEqual([['Re-admit', ['re']]]);
    expect(shape('deadline', [row('d', 'decided', { actedAt: '2026-10-22T00:00:00Z' })])).toEqual([['Decided this week', ['d']]]);
    expect(groupDesk([], 'project')).toEqual([]);
  });

  it('a read-only kind the desk has no group for still gets a row', () => {
    expect(shape('kind', [row('x', 'other', { src: 'promote' })])).toEqual([['Elsewhere', ['x']]]);
  });
});

describe('summarize', () => {
  it('counts the open rows and their projects, and the oldest known start', () => {
    expect(summarize(items)).toEqual({ count: 8, projects: 2, oldestOpenedAt: '2026-10-20T08:00:00Z' });
  });

  it('the oldest start is unknown, not zero, when no open row has one', () => {
    expect(summarize([row('a', 'promote'), row('d', 'decided', { openedAt: '2026-01-01T00:00:00Z' })])).toEqual({ count: 1, projects: 1, oldestOpenedAt: null });
    expect(summarize([])).toEqual({ count: 0, projects: 0, oldestOpenedAt: null });
  });
});

describe('groupDesk by kind, every row once', () => {
  it('puts a read-only item of each inbox kind in exactly one group', () => {
    const kinds: NeedsKind[] = ['promote', 'signoff', 'gaps', 'readmit', 'setup'];
    const list = kinds.map((k) => row(`o-${k}`, 'other', { src: k }));
    const seen = groupDesk(list, 'kind').flatMap((g) => g.items.map((n) => n.id));
    expect([...seen].sort()).toEqual(list.map((n) => n.id).sort());
  });
});
