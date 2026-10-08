// Which tiers a class can be revoked to. Restricting is free: any rung below the current one, at once. What a row shows
// is its cell (the index's one reading, server/index/views/standing.ts): a tier, no record yet, a class several agents
// hold with each holder at its own tier, or unknown. Only a tier is a rung; no record yet is never a quarantine.
import { cellOf, RUNGS, rungIndex, type Shown } from '@/lib/promotion';
import { cellName, type Holder } from '@/lib/tiers';
import type { Ceiling, Tier } from '../types';

export { cellOf, RUNGS, rungIndex };

/** A split class's holders, when it is one and they are known. */
export const holdersOf = (c: Shown): readonly Holder[] | undefined => (cellOf(c) === 'refused' && c.holders?.length ? c.holders : undefined);

/** The row's tier name: a tier's, "No record yet", "Split: a Supervised · b Assisted", or "unknown". */
export const shownName = (c: Shown): string => cellName(cellOf(c), holdersOf(c));

/** A real quarantine (a tripwire, a revoke to quarantined): the only class Re-admit is offered for. */
export const isQuarantine = (c: Shown): boolean => cellOf(c) === 'quarantined';

/**
 * The tier revoke and promote start from: the class's tier; for a split class its highest holder (a revoke lowers every
 * holder above the target). Null when there is none: no record yet, or unknown.
 */
export function actsFrom(c: Shown): Ceiling | null {
  const cell = cellOf(c);
  if (cell === null || cell === 'no_record') return null;
  if (cell !== 'refused') return cell;
  const hs = holdersOf(c);
  return hs ? hs.reduce<Tier>((high, h) => (rungIndex(h.tier) > rungIndex(high) ? h.tier : high), 'quarantined') : null;
}

/** Every tier a class can be taken down to, nearest first. Human only, Quarantined and a class with no tier have none. */
export function revokeTargets(tier: Ceiling | null): Tier[] {
  if (tier === null || tier === 'human_only') return [];
  return RUNGS.slice(0, rungIndex(tier)).reverse();
}

/** Where `r` (one step) or `q` (quarantine) takes a class, or null when there is nowhere to go. */
export function revokeTarget(tier: Ceiling | null, want: 'step' | 'quarantine' = 'step'): Tier | null {
  const lower = revokeTargets(tier);
  if (want === 'quarantine') return lower.includes('quarantined') ? 'quarantined' : null;
  return lower[0] ?? null;
}

/** Why `r` does nothing, for the dock line. */
export function nothingToRevoke(c: Shown): string {
  const cell = cellOf(c);
  if (cell === 'human_only') return 'never an agent';
  if (cell === 'no_record') return 'no record yet: not trusted, nothing to lower';
  if (cell === null) return 'its tier is unknown';
  return 'already read and comment only';
}
