// The rungs of the ladder and the cell a class shows. A cell is the index's one reading (server/index/views/standing.ts):
// a tier, no record yet, a class several agents hold, or unknown. Only a tier is a rung.
import type { ClassCell, Holder } from '@/lib/tiers';
import { TIER_ORDER, type Ceiling, type Tier } from '@/schemas/tier';

/** The rungs, bottom to top: Q A S H. */
export const RUNGS: readonly Tier[] = TIER_ORDER;

export const rungIndex = (tier: Ceiling): number => RUNGS.findIndex((t) => t === tier);

export interface Shown {
  tier: Ceiling;
  cell?: ClassCell;
  holders?: readonly Holder[];
}

/** What the row shows. The demo fixture sends no cell: its tier is the cell. */
export const cellOf = (c: Shown): ClassCell => (c.cell === undefined ? c.tier : c.cell);
