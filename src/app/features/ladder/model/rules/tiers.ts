// Which tiers a class can be revoked to. Restricting is free: any rung below the current one, at once.
import { TIER_ORDER } from '@/schemas/tier';
import type { Ceiling, Tier } from '../types';

/** The rungs, bottom to top: Q A S H. */
export const RUNGS: readonly Tier[] = TIER_ORDER;

export const rungIndex = (tier: Ceiling): number => RUNGS.findIndex((t) => t === tier);

/** Every tier a class can be taken down to, nearest first. Human only and Quarantined have none. */
export function revokeTargets(tier: Ceiling): Tier[] {
  if (tier === 'human_only') return [];
  return RUNGS.slice(0, rungIndex(tier)).reverse();
}

/** Where `r` (one step) or `q` (quarantine) takes a class, or null when there is nowhere to go. */
export function revokeTarget(tier: Ceiling, want: 'step' | 'quarantine' = 'step'): Tier | null {
  const lower = revokeTargets(tier);
  if (want === 'quarantine') return lower.includes('quarantined') ? 'quarantined' : null;
  return lower[0] ?? null;
}

/** Why `r` does nothing, for the dock line. */
export const nothingToRevoke = (tier: Ceiling): string =>
  tier === 'human_only' ? 'never an agent' : 'already read and comment only';
