import { describe, expect, it } from 'vitest';
import { demoSource } from '@/server/data/demoSource';
import type { FleetProject } from '@/lib/demo/types';
import { totalsOf } from '../../../monitor/model/totals';
import { districtsOf } from '../../model/city';
import { towerShape } from '../../model/shapes';
import { fleetTotals } from '../../model/words';

const fleet = demoSource.getFleet();
const base = fleet.projects.find((p) => p.id === 'docs-portal')!;
const nulls = Object.fromEntries(Object.keys(base.classTiers).map((k) => [k, null]));
// the door spells it four times over: the answer's total, the district's, the tower's lamps (none drawn unwatched) and Monitor's
const q = (p: FleetProject) => {
  const d = districtsOf([p.group], [p])[0]!;
  const lamps = p.state === 'not-set-up' ? 0 : towerShape(d.placed[0]!, fleet.classes).lamps.length;
  return { door: fleetTotals([p]).quar, district: d.quar, lamps, monitor: totalsOf([p]).quar };
};
const all = (n: number) => ({ door: n, district: n, lamps: n, monitor: n });

describe('the door and Monitor count one quarantine figure', () => {
  it('agree on the demo', () => {
    expect(totalsOf(fleet.projects).quar).toBe(fleetTotals(fleet.projects).quar);
  });
  it('count a stale project with known tiers by its last known quarantines', () => {
    const stale = { ...base, state: 'stale' as const, tiers: { ...base.tiers!, quarantined: 2 } };
    expect(q(stale)).toEqual(all(2));
  });
  it('count a watching project whose every tier is unknown as 0, never as quarantined', () => {
    const unknown = { ...base, state: 'watching' as const, classTiers: nulls, tiers: { ...base.tiers!, quarantined: 3 } };
    expect(q(unknown)).toEqual(all(0));
  });
  it('count an unwatched project as 0', () => {
    expect(q({ ...base, state: 'not-set-up' as const, tiers: { ...base.tiers!, quarantined: 4 } })).toEqual(all(0));
  });
});
