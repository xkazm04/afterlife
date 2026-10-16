import { describe, expect, it } from 'vitest';
import { SMART_FILTERS } from './smartFilters';
import { DEFAULT_LIST_STATE, decodeListState, encodeListState, type FleetListState } from './urlState';

const back = (s: FleetListState) => decodeListState(new URLSearchParams(encodeListState(s)));

describe('fleet list URL state', () => {
  it('encodes the default state to a clean URL', () => {
    expect(encodeListState(DEFAULT_LIST_STATE)).toBe('');
    expect(decodeListState({})).toEqual(DEFAULT_LIST_STATE);
  });

  it('round-trips a busy state', () => {
    const s: FleetListState = {
      view: 'classes',
      sort: { key: 'name', dir: -1 },
      grouped: false,
      collapsed: new Set(['payments', 'data & ml']),
      filters: { source: 'g:payments', q: 'led ger&=', states: new Set(['stale', 'watching']), tiers: new Set(['hands_off', 'quarantined']) },
    };
    expect(back(s)).toEqual(s);
  });

  it('round-trips each default-direction and flipped sort', () => {
    const cases = [['tiers', 'attention'], ['tiers', 'name'], ['tiers', 'tier:supervised'], ['classes', 'class:deploy'], ['stages', 'stage:2']] as const;
    for (const [view, key] of cases) {
      for (const dir of [1, -1] as const) expect(back({ ...DEFAULT_LIST_STATE, view, sort: { key, dir } }).sort).toEqual({ key, dir });
    }
  });

  it('reads the server searchParams shape, including repeated keys', () => {
    const s = decodeListState({ state: ['stale', 'bogus'], tier: 'hands_off', q: 'x' });
    expect([...s.filters.states]).toEqual(['stale']);
    expect([...s.filters.tiers]).toEqual(['hands_off']);
    expect(s.filters.q).toBe('x');
  });

  it('falls back to defaults for unknown or garbage params and never throws', () => {
    const junk = { view: 'nope', sort: 'tier:zzz', dir: 'sideways', src: 'g:', state: 'x', tier: ['y'], stuff: '1' };
    expect(decodeListState(junk)).toEqual(DEFAULT_LIST_STATE);
    expect(decodeListState({ sort: ['stage:abc'], view: ['stages', 'tiers'] }).sort).toEqual(DEFAULT_LIST_STATE.sort);
    expect(decodeListState(null)).toEqual(DEFAULT_LIST_STATE);
    expect(decodeListState(undefined)).toEqual(DEFAULT_LIST_STATE);
  });

  it('drops a sort the decoded view does not have', () => {
    expect(decodeListState({ view: 'classes', sort: 'tier:supervised' }).sort).toEqual(DEFAULT_LIST_STATE.sort);
  });
});

describe('smart-filter ids in the URL', () => {
  it.each(SMART_FILTERS.map((f) => f.id))('keeps the %s smart filter through a round trip', (id) => {
    expect(back({ ...DEFAULT_LIST_STATE, filters: { ...DEFAULT_LIST_STATE.filters, source: id } }).filters.source).toBe(id);
  });
});
