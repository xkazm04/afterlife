import { describe, expect, it } from 'vitest';
import { DECISION_IDS } from '../../data/constants';
import { pickNeedsYouDemo } from '../../data/pick';
import type { NeedsYouDemo } from '../../data/types';
import { initialState } from '../state';
import { groupsFor } from './grouping';
import { decisionCounts } from './rowState';

const FIXED = ['n1', 'n2', 'n4', 'n5'];
const demo = pickNeedsYouDemo();
/** The ids the desk really has: the four fixed decisions plus one per proposal the data source returned. */
const expectedIds = (d: NeedsYouDemo): string[] => [...FIXED, ...d.gaps.map((g) => g.id)].sort();

describe('the desk row ids are derived from the proposals, not restated', () => {
  it('DECISION_IDS is exactly the fixed decisions plus demo.gaps', () => {
    expect([...DECISION_IDS].sort()).toEqual(expectedIds(demo));
  });
  it.each(['kind', 'project', 'deadline'] as const)('By %s lists each derived id once', (mode) => {
    const listed = groupsFor(mode, initialState(demo)).filter((g) => !g.hist).flatMap((g) => [...g.ids]);
    expect([...listed].sort()).toEqual(expectedIds(demo));
  });
});
