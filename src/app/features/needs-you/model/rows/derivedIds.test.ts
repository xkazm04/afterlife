import { describe, expect, it } from 'vitest';
import { pickNeedsYouDemo } from '../../data/pick';
import type { NeedsYouDemo } from '../../data/types';
import { initialState } from '../state';
import { groupsFor } from './grouping';
import { decisionCounts, decisionIds } from './rowState';

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
