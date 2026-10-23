import { describe, expect, it } from 'vitest';
import { demoSource } from '@/server/data/demoSource';
import type { FleetProject } from '@/lib/demo/types';
import { totalsOf } from '../../../monitor/model/totals';
import { fleetTotals } from '../../model/words';

const fleet = demoSource.getFleet();
const base = fleet.projects.find((p) => p.id === 'docs-portal')!;
const nulls = Object.fromEntries(Object.keys(base.classTiers).map((k) => [k, null]));
const q = (p: FleetProject) => ({ door: fleetTotals([p]).quar, monitor: totalsOf([p]).quar });

describe('the door and Monitor count one quarantine figure', () => {
  it('agree on the demo', () => {
    expect(totalsOf(fleet.projects).quar).toBe(fleetTotals(fleet.projects).quar);
  });
  it('count a stale project with known tiers by its last known quarantines', () => {
    const stale = { ...base, state: 'stale' as const, tiers: { ...base.tiers!, quarantined: 2 } };
    expect(q(stale)).toEqual({ door: 2, monitor: 2 });
  });
  it('count a watching project whose every tier is unknown as 0, never as quarantined', () => {
    const unknown = { ...base, state: 'watching' as const, classTiers: nulls, tiers: { ...base.tiers!, quarantined: 3 } };
    expect(q(unknown)).toEqual({ door: 0, monitor: 0 });
  });
  it('count an unwatched project as 0', () => {
    expect(q({ ...base, state: 'not-set-up' as const, tiers: { ...base.tiers!, quarantined: 4 } })).toEqual({ door: 0, monitor: 0 });
  });
});
