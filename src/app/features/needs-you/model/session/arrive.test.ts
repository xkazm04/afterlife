import { describe, expect, it } from 'vitest';
import { DEMO } from '@/lib/demo';
import { reduce } from '../reducer';
import { initialState } from '../state';
import { arriveDemo } from './arrive';
import type { NeedsYouDemo } from '../../data/types';

const gaps = DEMO.maturity.proposals;
const demo = { gaps } as unknown as NeedsYouDemo;

describe('arriveDemo: the desk landing in the store', () => {
  it('a store opened before the read takes the gaps\' opening picks', () => {
    const before = initialState({ gaps: [] } as unknown as NeedsYouDemo);
    expect(arriveDemo(before, demo)).toEqual(initialState(demo));
  });

  it('a re-read keeps what the person did (a pick undone, a selection, a query)', () => {
    let s = initialState(demo);
    const id = gaps[0]?.id ?? 'g1';
    s = { ...s, gaps: { ...s.gaps, [id]: !s.gaps[id] } };
    s = reduce(s, { type: 'select', id: 'n1' }, demo);
    expect(arriveDemo(s, demo)).toBe(s);
  });
});
