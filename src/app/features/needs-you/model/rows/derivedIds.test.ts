import { describe, expect, it } from 'vitest';
import { pickNeedsYouDemo } from '../../data/pick';
import type { NeedsYouDemo } from '../../data/types';
import { initialState } from '../state';
import { groupsFor } from './grouping';
import { DECISION_KEYS, isDecisionKey } from '../types';
import { decisionCounts, decisionIds, rowState } from './rowState';

const FIXED = ['n1', 'n2', 'n4', 'n5'];
const demo = pickNeedsYouDemo();
/** The ids the desk really has: the four fixed decisions plus one per proposal the data source returned. */
const expectedIds = (d: NeedsYouDemo): string[] => [...FIXED, ...d.gaps.map((g) => g.id)].sort();
const withExtraGap = (d: NeedsYouDemo): NeedsYouDemo => ({ ...d, gaps: [...d.gaps, { ...d.gaps[0]!, id: 'g5' }] });

describe.each([
  ['the demo desk', demo],
  ['a desk with a fifth proposal', withExtraGap(demo)],
])('the row ids of %s are derived from its proposals, not restated', (_name, d) => {
  const s = initialState(d);
  it('the table lists the fixed decisions plus demo.gaps', () => {
    expect([...decisionIds(s)].sort()).toEqual(expectedIds(d));
  });
  it.each(['kind', 'project', 'deadline'] as const)('By %s lists each derived id once', (mode) => {
    const listed = groupsFor(mode, s).filter((g) => !g.hist).flatMap((g) => [...g.ids]);
    expect([...listed].sort()).toEqual(expectedIds(d));
  });
  it('the sidebar counts every one of them', () => {
    expect(decisionCounts(s).all).toBe(expectedIds(d).length);
  });
});

describe('the fixed decision ids are one list (DECISION_KEYS), not restated per file', () => {
  const s = initialState(demo);
  it('isDecisionKey admits exactly DECISION_KEYS', () => {
    expect([...DECISION_KEYS].sort()).toEqual(FIXED);
    for (const id of ['n0', 'n3', 'n6', 'g1', 'h0', 'g:trust']) expect(isDecisionKey(id)).toBe(false);
  });
  it('the state, the State column and the table all hold each key', () => {
    expect(Object.keys(s.status).sort()).toEqual([...DECISION_KEYS].sort());
    for (const id of DECISION_KEYS) expect(rowState(s, id).label).not.toBe('');
    expect(decisionIds(s)).toEqual(expect.arrayContaining([...DECISION_KEYS]));
  });
});
