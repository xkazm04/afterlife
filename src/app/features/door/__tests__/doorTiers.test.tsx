// The door's tier cells come from lib/tiers: a tier added there must not leave the legend, the L2 list or the windows out.
import { createElement } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { STANDING_META, TIER_DISPLAY_ORDER, TIER_META } from '@/lib/tiers';
import { DOOR_TIERS, legendTiers, tierLabel } from '../components/rail/Rail';
import { TIER_CLASS } from '../components/scene/District';

vi.mock('next/link', () => ({ default: (p: { href: string; children?: unknown }) => createElement('a', { href: p.href }, p.children as never) }));

const cells = [...TIER_DISPLAY_ORDER, ...Object.keys(STANDING_META)];

describe('door tier cells', () => {
  it('the door list is the five tiers then the standings, in lib order', () => {
    expect([...DOOR_TIERS]).toEqual(cells);
  });
  it('the legend names every cell as lib/tiers does', () => {
    expect(legendTiers().map(([t]) => t)).toEqual(cells);
    for (const [t, name] of legendTiers()) expect(name).toBe(t in TIER_META ? TIER_META[t as keyof typeof TIER_META].name : STANDING_META[t as keyof typeof STANDING_META].name);
  });
  it('the window classes cover every cell, and the unknown one', () => {
    expect(Object.keys(TIER_CLASS).sort()).toEqual([...cells, 'null'].sort());
  });
  it('the L2 autonomy list keeps its wording for every cell', () => {
    expect(cells.map((t) => tierLabel(t))).toEqual(['hands-off', 'supervised', 'assisted', 'quarantined', 'human only', 'no record yet', 'split, each holder at its own tier']);
  });
});
