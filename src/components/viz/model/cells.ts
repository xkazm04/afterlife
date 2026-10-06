// Pure cell logic for the small drawn glyphs (kept apart from the components so it can be tested).
import type { Ceiling } from '@/schemas';
import { TIER_ORDER } from '@/schemas/tier';

export type RungCell = 'at' | 'in' | 'out';
export type DayCell = 'clean' | 'fail' | 'none';

/** The four cells Q A S H: at = where it stands now, in = allowed, out = above the ceiling (or Human only). */
export function rungCells(tier: Ceiling, ceiling: Ceiling): RungCell[] {
  if (ceiling === 'human_only') return TIER_ORDER.map((): RungCell => 'out');
  const ci = TIER_ORDER.findIndex((t) => t === ceiling);
  const ti = TIER_ORDER.findIndex((t) => t === tier);
  return TIER_ORDER.map((_, i): RungCell => (i === ti ? 'at' : i > ci ? 'out' : 'in'));
}

/** Per-day state for the strip, oldest left. The last `clean` days are filled. */
export function dayCells(clean: number, days = 14, revertedToday = false): DayCell[] {
  const n = Math.max(0, Math.min(days, clean));
  return Array.from({ length: days }, (_, i): DayCell => {
    if (i >= days - n) return 'clean';
    return revertedToday && i === days - 1 && n === 0 ? 'fail' : 'none';
  });
}

/** The tick class index for a rung: clamped to 0..4. */
export function clampRung(r: number): 0 | 1 | 2 | 3 | 4 {
  return Math.min(4, Math.max(0, Math.round(r))) as 0 | 1 | 2 | 3 | 4;
}
