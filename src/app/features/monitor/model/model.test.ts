import { describe, expect, it } from 'vitest';
import type { FleetProject } from '@/lib/demo/types';
import { amplitude, beatPath, leadPaths, pipCount, slotsAlong } from './beat';
import { MARKS, leadsOf, stateLine, topWaiting, totalsOf } from './totals';

const base: FleetProject = {
  id: 'p',
  name: 'p',
  what: '',
  state: 'watching',
  armed: 8,
  tiers: { hands_off: 1, supervised: 0, assisted: 0, quarantined: 0, human_only: 0 },
  proofs7d: { pass: 3, fail: 1, inconclusive: 0 },
  demotions7d: 0,
  needsYou: 0,
  stages: [1, 1, 1, 1, 1, 1, 1, 1, 1],
  feed: { ageSec: 12, ok: true },
  env: { staging: 'rev 1', production: 'rev 1' },
  craOpen: 0,
  last: null,
  group: 'g1',
  classTiers: {},
} as unknown as FleetProject;
const mk = (o: Partial<FleetProject>): FleetProject => ({ ...base, ...o }) as FleetProject;

const fleet = [
  mk({ id: 'a', name: 'a', needsYou: 5, tiers: { ...base.tiers, quarantined: 1 } }),
  mk({ id: 'b', name: 'b', state: 'stale', needsYou: 1, feed: { ageSec: 2820, ok: false, error: 'project token expired' } }),
  mk({ id: 'c', name: 'c', state: 'setting-up', armed: 2, group: 'g2' }),
  mk({ id: 'd', name: 'd', state: 'not-set-up', needsYou: 3, armed: 0, proofs7d: null, group: 'g2' }),
];

describe('totals', () => {
  it('counts states, live decisions and quarantine, never the unwatched decisions', () => {
    const t = totalsOf(fleet);
    expect(t).toMatchObject({ n: 4, needs: 6, needsP: 2, stale: 1, setup: 1, unwatched: 1, watching: 1, quar: 1, pass: 9, fail: 3 });
  });
  it('makes one lead per group in group order', () => {
    expect(leadsOf(['g2', 'g1'], fleet).map((l) => [l.group, l.projects.length, l.needs])).toEqual([
      ['g2', 2, 0],
      ['g1', 2, 6],
    ]);
  });
  it('ranks who waits most, and marks match their state', () => {
    expect(topWaiting(fleet).map((p) => p.id)).toEqual(['a', 'b']);
    const match = (k: string) => fleet.filter(MARKS.find((m) => m.kind === k)!.test).map((p) => p.id);
    expect(match('quar')).toEqual(['a']);
    expect(match('unwatched')).toEqual(['d']);
  });
  it('says stale and unknown in words', () => {
    expect(stateLine(fleet[1]!)).toBe('stale · project token expired · 1 decision waits (last known)');
    expect(stateLine(fleet[3]!)).toBe('not watched · unknown, not zero');
  });
});

describe('beat grammar', () => {
  it('grows the R wave with armed tracks and keeps setting-up low', () => {
    expect(amplitude(mk({ armed: 8 }), 30)).toBeCloseTo(30);
    expect(amplitude(mk({ armed: 0 }), 30)).toBeCloseTo(11.4);
    expect(amplitude(mk({ state: 'setting-up', armed: 8 }), 30)).toBeCloseTo(12.6);
  });
  it('draws a beat inside its slot', () => {
    const d = beatPath({ x: 10, w: 20, base: 50, amax: 30, ins: 0 }, 30, false);
    expect(d.startsWith('M10.0 50.0')).toBe(true);
    expect(d.endsWith('L30.0 50.0')).toBe(true);
    expect(d).toContain('20.0'); // the R peak at base - amplitude
  });
  it('routes each state to its own layer', () => {
    const p = leadPaths(fleet, slotsAlong(4, 400, 50, 30));
    expect(p.live).not.toBe('');
    expect(p.forming).not.toBe('');
    expect(p.flat).toContain('H200.0');
    expect(p.unknown).toContain('M303.0');
    expect(p.qdips).not.toBe('');
  });
  it('caps the pips at six and draws none for an unwatched project', () => {
    expect(pipCount(mk({ needsYou: 9 }))).toBe(6);
    expect(pipCount(fleet[3]!)).toBe(0);
  });
});
