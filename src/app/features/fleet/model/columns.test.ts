import { describe, expect, it } from 'vitest';
import { DEMO } from '@/lib/demo';
import { fleetColumns, gridFor } from './columns';
import type { FleetMeta } from './types';

const meta: FleetMeta = { classes: DEMO.fleet.classes, stages: DEMO.stages, tiers: DEMO.tiers };
const keys = (v: 'tiers' | 'classes' | 'stages') => fleetColumns(v, meta).map((c) => c.key);

describe('fleetColumns', () => {
  it('has 3 lead columns, 5 tiers and 3 tail columns in the tiers view', () => {
    const k = keys('tiers');
    expect(k).toHaveLength(11);
    expect(k.slice(0, 3)).toEqual(['name', 'state', 'needs']);
    expect(k.slice(3, 8)).toEqual(['tier:hands_off', 'tier:supervised', 'tier:assisted', 'tier:quarantined', 'tier:human_only']);
    expect(k.slice(8)).toEqual(['proofs', 'stages', 'feed']);
  });
  it('has twelve class columns, no stages column', () => {
    const k = keys('classes');
    expect(k).toHaveLength(17);
    expect(k).not.toContain('stages');
    expect(k).toContain('class:dep-bump.patch');
  });
  it('has nine stage columns', () => {
    expect(keys('stages').filter((x) => x.startsWith('stage:'))).toHaveLength(9);
  });
  it('tips a tier column with what it means', () => {
    const col = fleetColumns('tiers', meta).find((c) => c.tier === 'hands_off');
    expect(col?.tip).toContain(DEMO.tiers.hands_off.means);
    expect(col?.tip).toContain('rank by it');
  });
});

describe('gridFor', () => {
  it('scales the tier tracks with the text size', () => {
    expect(gridFor('tiers', false).columns).toContain('repeat(5, calc(88px * var(--ui-scale)))');
    expect(gridFor('classes', false).columns).toContain('repeat(12, calc(42px * var(--ui-scale)))');
    expect(gridFor('stages', false).columns).toContain('repeat(9, calc(54px * var(--ui-scale)))');
  });
  it('narrows the tier columns', () => {
    expect(gridFor('tiers', true).columns).toContain('repeat(5, calc(50px * var(--ui-scale)))');
    expect(gridFor('tiers', true).minWidth).toBe('calc(692px * var(--ui-scale))');
  });
});
