import { describe, expect, it } from 'vitest';
import { DEMO } from '@/lib/demo';
import { fleetColumns, gridFor, narrowLimit } from './columns';
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
    expect(gridFor('tiers', false, meta).columns).toContain('repeat(5, calc(88px * var(--ui-scale)))');
    expect(gridFor('classes', false, meta).columns).toContain('repeat(12, calc(42px * var(--ui-scale)))');
    expect(gridFor('stages', false, meta).columns).toContain('repeat(9, calc(54px * var(--ui-scale)))');
  });
  it('narrows the tier columns', () => {
    expect(gridFor('tiers', true, meta).columns).toContain('repeat(5, calc(50px * var(--ui-scale)))');
    expect(gridFor('tiers', true, meta).minWidth).toBe('calc(684px * var(--ui-scale))');
  });
});

describe('gridFor tracks follow the columns', () => {
  const tracks = (columns: string) => [...columns.matchAll(/repeat\((\d+),/g)].reduce((n, m) => n + Number(m[1]), 0);
  const sized = (classes: number, stages: number): FleetMeta => ({
    ...meta,
    classes: Array.from({ length: classes }, (_, i) => `c${i}`),
    stages: Array.from({ length: stages }, (_, i) => `s${i}`),
  });
  it.each([[12, 9], [14, 7], [3, 11]])('has one data track per class and stage column (%i classes, %i stages)', (c, s) => {
    const m = sized(c, s);
    expect(tracks(gridFor('classes', false, m).columns)).toBe(fleetColumns('classes', m).filter((x) => x.kind === 'class').length);
    expect(tracks(gridFor('stages', false, m).columns)).toBe(fleetColumns('stages', m).filter((x) => x.kind === 'stage').length);
  });
  it('keeps the demo minimum widths', () => {
    expect(gridFor('classes', false, meta).minWidth).toBe('calc(870px * var(--ui-scale))');
    expect(gridFor('stages', false, meta).minWidth).toBe('calc(852px * var(--ui-scale))');
  });
});

describe('narrowLimit', () => {
  it('scales the 900px threshold with the text size, as the grid minimums do', () => {
    expect(narrowLimit(900, 1)).toBe(900);
    expect(narrowLimit(900, 1.15)).toBeCloseTo(1035);
    expect(narrowLimit(900, 1.3)).toBeCloseTo(1170);
  });
  it('falls back to 1 for a missing or broken scale', () => {
    expect(narrowLimit(900, NaN)).toBe(900);
    expect(narrowLimit(900, 0)).toBe(900);
  });
});
