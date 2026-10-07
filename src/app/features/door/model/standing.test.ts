import { describe, expect, it } from 'vitest';
import type { FleetProject } from '@/lib/demo/types';
import { towerShape } from './shapes';
import { fleetTotals, MARK_TEST } from './words';

const P = (id: string, classTiers: FleetProject['classTiers'], quarantined: number): FleetProject => ({
  id, name: id, what: '', state: 'watching', armed: 0, group: 'g', needsYou: 0, craOpen: 0, stages: Array(9).fill(null),
  tiers: { hands_off: 0, supervised: 0, assisted: 0, quarantined, human_only: 0 }, proofs7d: null, demotions7d: null,
  feed: { ageSec: 0, ok: true }, classTiers,
});
const tripwire = P('tripwire', { a: 'quarantined', b: 'no_record' }, 1);
const norecord = P('norecord', { a: 'no_record', b: 'refused' }, 0);
const unknown = P('unknown', { a: null, b: null }, 3); // counts with no rows behind them are not read

describe('the door: no record yet is not a quarantine, unknown is not a count', () => {
  it('counts tripwire quarantines, no-record classes and split classes apart', () => {
    expect(fleetTotals([tripwire, norecord, unknown])).toMatchObject({ quar: 1, norec: 2, split: 1 });
    expect([tripwire, norecord, unknown].map((p) => MARK_TEST.split(p))).toEqual([false, true, false]);
  });
  it('lights the quarantine mark for a tripwire only, and the no-record mark apart', () => {
    expect([tripwire, norecord, unknown].map((p) => [MARK_TEST.quar(p), MARK_TEST.norec(p)])).toEqual([[true, true], [false, true], [false, false]]);
  });
  it('colours windows by standing and lights no lamp for unknown tiers', () => {
    const t = (p: FleetProject) => towerShape({ p, h: 30, i: 0, j: 0, x: 0, y: 0, gi: 0 }, ['a', 'b']);
    expect(Object.keys(t(norecord).windows).sort()).toEqual(['no_record', 'refused']);
    expect(t(tripwire).lamps).toHaveLength(1);
    expect(t(unknown).lamps).toHaveLength(0);
    expect(Object.keys(t(unknown).windows)).toEqual(['null']);
  });
});
