import { describe, expect, it } from 'vitest';
import { loadTasks } from '../build/loadTasks';
import type { TaskView } from '../types';
import { arrowSelection, emphasis, litLink, relatedIds, toggleSelection } from './selection';
import { tieKind, tieOpacity, tiePath, ties, untestedClaims } from './ties';

const tasks = loadTasks();
const get = (id: string): TaskView => {
  const t = tasks.find((x) => x.id === id);
  if (!t) throw new Error(id);
  return t;
};
const q4 = get('01J8Q4');
const q8 = get('01J8Q8');

describe('selection', () => {
  it('toggles: the same card clears, another replaces', () => {
    const a = toggleSelection(null, 'check', 'rescan');
    expect(a).toEqual({ side: 'check', id: 'rescan' });
    expect(toggleSelection(a, 'check', 'rescan')).toBeNull();
    expect(toggleSelection(a, 'claim', 'c1')).toEqual({ side: 'claim', id: 'c1' });
  });

  it('relates a claim to its checks and a check to its claims', () => {
    expect(relatedIds(q4, { side: 'claim', id: 'c1' }).checks).toEqual(['base-red', 'head-green', 'not-weakened', 'rescan']);
    expect(relatedIds(q4, { side: 'check', id: 'envelope' }).claims).toEqual([]);
    expect(relatedIds(q4, null)).toEqual({ checks: [], claims: [] });
  });

  it('emphasises the selection, what ties to it, and dims the rest', () => {
    const sel = { side: 'claim', id: 'c1' } as const;
    expect(emphasis(q4, sel, 'claim', 'c1')).toBe('sel');
    expect(emphasis(q4, sel, 'check', 'rescan')).toBe('rel');
    expect(emphasis(q4, sel, 'check', 'envelope')).toBe('dim');
    expect(emphasis(q4, sel, 'claim', 'c2')).toBe('dim');
    expect(emphasis(q4, null, 'check', 'rescan')).toBe('none');
  });

  it('lights the chain link of the selected check only', () => {
    expect(litLink(q4, { side: 'check', id: 'base-red' })).toBe(2);
    expect(litLink(q4, { side: 'check', id: 'envelope' })).toBe(1);
    expect(litLink(q4, { side: 'claim', id: 'c1' })).toBe(-1);
    expect(litLink(q4, null)).toBe(-1);
  });
});

describe('arrow keys', () => {
  it('start at the first check', () => {
    expect(arrowSelection(q4, null, 'ArrowDown')).toEqual({ side: 'check', id: 'base-red' });
  });

  it('walk a column and wrap around', () => {
    expect(arrowSelection(q4, { side: 'check', id: 'base-red' }, 'ArrowDown')).toEqual({ side: 'check', id: 'head-green' });
    expect(arrowSelection(q4, { side: 'check', id: 'base-red' }, 'ArrowUp')).toEqual({ side: 'check', id: 'rescan' });
    expect(arrowSelection(q4, { side: 'claim', id: 'c2' }, 'ArrowDown')).toEqual({ side: 'claim', id: 'c1' });
  });

  it('cross along a tie, falling back to the first of the other column', () => {
    expect(arrowSelection(q4, { side: 'check', id: 'rescan' }, 'ArrowLeft')).toEqual({ side: 'claim', id: 'c1' });
    expect(arrowSelection(q4, { side: 'check', id: 'envelope' }, 'ArrowLeft')).toEqual({ side: 'claim', id: 'c1' });
    expect(arrowSelection(q4, { side: 'claim', id: 'c1' }, 'ArrowRight')).toEqual({ side: 'check', id: 'base-red' });
    expect(arrowSelection(q4, { side: 'claim', id: 'c2' }, 'ArrowRight')).toEqual({ side: 'check', id: 'base-red' });
  });

  it('stay put when already on that side', () => {
    const sel = { side: 'check', id: 'rescan' } as const;
    expect(arrowSelection(q4, sel, 'ArrowRight')).toBe(sel);
  });
});

describe('ties', () => {
  it('classifies green, red and dashed', () => {
    expect(tieKind(true)).toBe('holds');
    expect(tieKind(false)).toBe('contradicts');
    expect(tieKind(null)).toBe('unknown');
    const all = ties(q8, null, null);
    expect(all.find((t) => t.checkId === 'envelope')).toMatchObject({ claimId: 'c3', kind: 'contradicts' });
    expect(all.filter((t) => t.kind === 'holds')).toHaveLength(3);
  });

  it('draws one tie per claim/check pair and none for invariants', () => {
    expect(ties(q4, null, null)).toHaveLength(4);
    expect(ties(get('01J8QC'), null, null).filter((t) => t.checkId === 'links')).toHaveLength(2);
  });

  it('emphasises the ties of the selection and fades the rest', () => {
    const sel = { side: 'claim', id: 'c1' } as const;
    expect(ties(q8, sel, null).filter((t) => t.emphasis === 'on').map((t) => t.checkId)).toEqual(['changelog-links']);
    expect(ties(q8, sel, null).filter((t) => t.emphasis === 'dim')).toHaveLength(3);
    expect(ties(q8, null, null).every((t) => t.emphasis === 'rest')).toBe(true);
    expect([tieOpacity('on'), tieOpacity('dim'), tieOpacity('rest')]).toEqual([1, 0.16, 0.75]);
  });

  it('holds back ties to checks that have not landed in a replay', () => {
    expect(ties(q4, null, -1)).toHaveLength(0);
    expect(ties(q4, null, 2).map((t) => t.checkId)).toEqual(['base-red', 'head-green']);
  });

  it('gives an untested claim a dashed "?" only after the verdict landed', () => {
    expect(untestedClaims(q4, null, null)).toEqual([{ claimId: 'c2', dim: false }]);
    expect(untestedClaims(q4, { side: 'claim', id: 'c1' }, null)).toEqual([{ claimId: 'c2', dim: true }]);
    expect(untestedClaims(q4, null, 2)).toEqual([]);
    expect(untestedClaims(q8, null, null)).toEqual([]);
  });

  it('builds a smooth cubic between the two edges', () => {
    expect(tiePath(0, 10, 100, 50)).toBe('M0 10 C50 10 50 50 100 50');
  });
});
