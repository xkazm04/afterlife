import { describe, expect, it } from 'vitest';
import type { Track } from '@/lib/demo';
import { repoPolicy } from '@/server/data/policy';
import type { ClassRow, TrackMap } from '../types';
import { SMART_FILTERS, filterCount, matchesQuery, tierCounts, visibleClasses } from './filters';

const row = (id: string, o: Partial<ClassRow> = {}): ClassRow => ({
  id, track: 'T1', ceiling: 'hands_off', tier: 'supervised', lease_days: null,
  record: { accepted: 5, needed: null, noEdit: 1, cleanDays: 5, reverts: 0 }, lastMove: '', pending: null, ...o,
});
const track = (id: string, key: string, name: string, proof: string): Track =>
  ({ id, key, name, verb: '', stages: [], armed: true, armedBy: '', classes: [], latest: { text: '', at: '' }, proof: { cls: proof, status: 'pass' }, needs: null });
const tracks: TrackMap = { T1: track('T1', 'patcher', 'Exploit-proof patcher', 'repro'), T2: track('T2', 'cra', 'EU CRA autopilot', 'human-review') };

const classes = [
  row('a'),
  row('b', { track: 'T2', tier: 'quarantined', ceiling: 'supervised' }),
  row('c', { tier: 'assisted', lease_days: 3, pending: 'e7f1' }),
  row('d', { tier: 'human_only', ceiling: 'human_only', record: null }),
];
const byId = Object.fromEntries(classes.map((c) => [c.id, c]));
const order = classes.map((c) => c.id);
const ids = (crit: Partial<{ src: string; filt: ClassRow['tier'] | null; q: string }>) =>
  visibleClasses(order, byId, { src: 'all', filt: null, q: '', ...crit }, tracks).map((c) => c.id);

describe('visibleClasses', () => {
  it('shows everything by default, keeping the frozen order', () => {
    expect(ids({})).toEqual(['a', 'b', 'c', 'd']);
  });
  it('filters by track, tier and smart filter', () => {
    expect(ids({ src: 'T2' })).toEqual(['b']);
    expect(ids({ filt: 'supervised' })).toEqual(['a']);
    expect(ids({ src: 'leased' })).toEqual(['c']);
    expect(ids({ src: 'quar' })).toEqual(['b']);
    expect(ids({ src: 'pending' })).toEqual(['c']);
    expect(ids({ src: 'below' })).toEqual(['a', 'c']);
  });
  it('Below ceiling ignores Quarantined and Human only', () => {
    const below = SMART_FILTERS.find((s) => s.id === 'below');
    expect(below?.test(classes[1] as ClassRow, '', null)).toBe(false);
    expect(below?.test(classes[3] as ClassRow, '', null)).toBe(false);
  });
  it('Can promote counts against trust-policy.yml, and finds nothing without it', () => {
    const promotable = (policy: ReturnType<typeof repoPolicy>) => visibleClasses(order, byId, { src: 'promote', filt: null, q: '' }, tracks, policy).map((c) => c.id);
    expect(promotable(repoPolicy())).toEqual(['c']);
    expect(promotable(null)).toEqual([]);
  });
  it('searches the id, track id, key and name', () => {
    expect(ids({ q: 'patch' })).toEqual(['a', 'c', 'd']);
    expect(ids({ q: ' CRA ' })).toEqual(['b']);
    expect(matchesQuery(classes[0] as ClassRow, 'T1', tracks)).toBe(true);
    expect(ids({ q: 'zzz' })).toEqual([]);
  });
  it('combines the filters', () => {
    expect(ids({ src: 'T1', filt: 'assisted', q: 'c' })).toEqual(['c']);
  });
});

describe('counts', () => {
  it('counts the filters that are on', () => {
    expect(filterCount({ src: 'all', filt: null, q: '' })).toBe(0);
    expect(filterCount({ src: 'T1', filt: 'assisted', q: ' x ' })).toBe(3);
    expect(filterCount({ src: 'all', filt: null, q: '   ' })).toBe(0);
  });
  it('counts classes per tier', () => {
    expect(tierCounts(classes)).toEqual({ hands_off: 0, supervised: 1, assisted: 1, quarantined: 1, human_only: 1 });
  });
});
