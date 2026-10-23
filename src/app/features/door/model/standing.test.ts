import { afterEach, describe, expect, it } from 'vitest';
import type { FleetProject } from '@/lib/demo/types';
import { towerShape } from './shapes';
import { districtsOf } from './city';
import { fleetTotals, MARK_TEST, topTiers } from './words';

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

// The city is server-rendered and hydrated: a name order that follows the runtime's locale places towers differently on a
// Czech browser ("ch" sorts after "h") than on the en-US server, and React keeps the server's attributes on a mismatch.
describe('the door orders names the same on the server and in any browser locale', () => {
  const own = String.prototype.localeCompare;
  afterEach(() => void (String.prototype.localeCompare = own));
  it('places and lists "charts" before "hub" under a cs default locale', () => {
    String.prototype.localeCompare = function (this: string, that: string, loc?: string | string[], o?: Intl.CollatorOptions) {
      return own.call(this, that, loc ?? 'cs', o);
    };
    const ps = ['hub', 'charts'].map((id) => ({ ...P(id, {}, 0), needsYou: 2 }));
    expect(districtsOf(['g'], ps)[0]!.placed.map((t) => t.p.id)).toEqual(['charts', 'hub']);
    expect(topTiers(ps)[0]!.names).toEqual(['charts', 'hub']);
  });
});
