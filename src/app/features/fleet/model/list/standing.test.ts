import { describe, expect, it } from 'vitest';
import { makeProject } from '../testProject';
import { filterProjects, EMPTY_FILTERS } from './filtering';
import { smartFilter } from './smartFilters';
import { sortValue } from './sorting';

// A live project as the poller writes it: armed 0, tiers known from its rows; one class no agent holds yet, one split.
const live = makeProject({
  id: 'live', armed: 0,
  tiers: { hands_off: 1, supervised: 0, assisted: 0, quarantined: 0, human_only: 1 },
  classTiers: { 'dep-bump.patch': 'hands_off', 'report.submit': 'human_only', 'code-fix.patch': 'no_record', 'patch-bump': 'refused' },
  holders: { 'patch-bump': [{ agent: 'ai-gardener-a', tier: 'supervised' }, { agent: 'ai-gardener-b', tier: 'assisted' }] },
});
const unknown = makeProject({ id: 'unknown', armed: 0, tiers: { hands_off: 0, supervised: 0, assisted: 0, quarantined: 0, human_only: 0 }, classTiers: { 'dep-bump.patch': null } });

describe('tiers known from the class cells, never from armed', () => {
  it('sorts and filters a live project by its tiers even with armed 0', () => {
    expect(sortValue(live, 'tier:hands_off')).toBe(1);
    expect(filterProjects([live], { ...EMPTY_FILTERS, tiers: new Set(['hands_off' as const]) })).toHaveLength(1);
    expect(smartFilter('handsoff').test(live)).toBe(true);
  });
  it('keeps unknown tiers unknown: no sort value, no filter match, never 0', () => {
    expect(sortValue(unknown, 'tier:hands_off')).toBeNull();
    expect(sortValue(unknown, 'class:dep-bump.patch')).toBeNull();
    expect(filterProjects([unknown], { ...EMPTY_FILTERS, tiers: new Set(['quarantined' as const]) })).toEqual([]);
  });
  it('never counts a class with no record yet, or a split one, as a quarantine', () => {
    expect(smartFilter('quar').test(live)).toBe(false);
    expect(filterProjects([live], { ...EMPTY_FILTERS, tiers: new Set(['quarantined' as const]) })).toEqual([]);
    // no record sorts below every tier, above unknown; a split class at its most restrictive holder
    expect(sortValue(live, 'class:code-fix.patch')).toBe(0);
    expect(sortValue(live, 'class:patch-bump')).toBe(sortValue(makeProject({ id: 'a', classTiers: { 'patch-bump': 'assisted' } }), 'class:patch-bump'));
  });
});
