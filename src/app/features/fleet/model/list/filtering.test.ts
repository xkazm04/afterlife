import { describe, expect, it } from 'vitest';
import { makeProject } from '../testProject';
import { EMPTY_FILTERS, filterCount, filterProjects, matchesSource, menuFilterCount, sourceLabel, toggleIn } from './filtering';
import { countSmart, smartFilter } from './smartFilters';

const P = [
  makeProject({ id: 'a', needsYou: 2, what: 'Core API', group: 'core' }),
  makeProject({ id: 'b', state: 'stale', group: 'pay', tiers: { hands_off: 0, supervised: 0, assisted: 2, quarantined: 1, human_only: 0 } }),
  makeProject({ id: 'c', state: 'not-set-up', armed: 0, group: 'pay', tiers: { hands_off: 0, supervised: 0, assisted: 0, quarantined: 0, human_only: 0 } }),
  makeProject({ id: 'd', state: 'setting-up', group: 'data' }),
];

describe('smart filters', () => {
  it('tests each rule', () => {
    expect(P.filter(smartFilter('needs').test).map((p) => p.id)).toEqual(['a']);
    expect(P.filter(smartFilter('stale').test).map((p) => p.id)).toEqual(['b']);
    expect(P.filter(smartFilter('setup').test).map((p) => p.id)).toEqual(['d']);
    expect(P.filter(smartFilter('unwatched').test).map((p) => p.id)).toEqual(['c']);
    expect(P.filter(smartFilter('quar').test).map((p) => p.id)).toEqual(['b']);
    expect(countSmart(P, 'handsoff')).toBe(2);
  });
});

describe('sources', () => {
  it('matches all, a group and a smart filter', () => {
    expect(matchesSource(P[0]!, 'all')).toBe(true);
    expect(matchesSource(P[1]!, 'g:pay')).toBe(true);
    expect(matchesSource(P[0]!, 'g:pay')).toBe(false);
    expect(matchesSource(P[0]!, 'needs')).toBe(true);
  });
  it('labels them', () => {
    expect(sourceLabel('all')).toBe('All projects');
    expect(sourceLabel('g:risk')).toBe('risk');
    expect(sourceLabel('quar')).toBe('Has quarantine');
  });
});

describe('filterProjects', () => {
  it('returns everything with no filters', () => {
    expect(filterProjects(P, EMPTY_FILTERS)).toHaveLength(4);
  });
  it('searches name, group and description, ignoring case and padding', () => {
    expect(filterProjects(P, { ...EMPTY_FILTERS, q: ' CORE api ' }).map((p) => p.id)).toEqual(['a']);
    expect(filterProjects(P, { ...EMPTY_FILTERS, q: ' core ' }).map((p) => p.id)).toEqual(['a']);
    expect(filterProjects(P, { ...EMPTY_FILTERS, q: 'DATA' }).map((p) => p.id)).toEqual(['d']);
    expect(filterProjects(P, { ...EMPTY_FILTERS, q: 'b' }).map((p) => p.id)).toEqual(['b']);
  });
  it('ANDs the menu filters: any chosen state, any class at a chosen tier', () => {
    const f = { ...EMPTY_FILTERS, states: new Set(['stale' as const, 'watching' as const]), tiers: new Set(['quarantined' as const]) };
    expect(filterProjects(P, f).map((p) => p.id)).toEqual(['b']);
  });
});

describe('counts', () => {
  it('counts source, search and each tick', () => {
    expect(filterCount(EMPTY_FILTERS)).toBe(0);
    const f = { source: 'needs' as const, q: ' x ', states: new Set(['stale' as const]), tiers: new Set(['hands_off' as const, 'assisted' as const]) };
    expect(filterCount(f)).toBe(5);
    expect(menuFilterCount(f)).toBe(3);
    expect(filterCount({ ...EMPTY_FILTERS, q: '   ' })).toBe(0);
  });
  it('toggles without mutating', () => {
    const s = new Set(['stale' as const]);
    expect([...toggleIn(s, 'watching')]).toEqual(['stale', 'watching']);
    expect([...toggleIn(s, 'stale')]).toEqual([]);
    expect(s.size).toBe(1);
  });
});
