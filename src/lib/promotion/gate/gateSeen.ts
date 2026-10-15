// The gate last seen deciding for a class's holder, in words: the latest tier_decision belay-apply wrote since the record's
// since (poller/derive/gate.ts). One wording for the Ladder's Grant section, its track headers and Setup's track page.
import type { GateSeen } from '@/lib/demo/types';
import { formatAge } from '@/lib/format/time';
import { TIER_META } from '@/lib/tiers';

/** "!41 at Hands-off, 4.9 h ago"; without a clock (before the page mounts) the age is left out, never guessed. */
export function gateSeenWords(g: GateSeen, now: Date | null): string {
  const at = Date.parse(g.at);
  const age = now && !Number.isNaN(at) ? `, ${formatAge((now.getTime() - at) / 1000)} ago` : '';
  return `!${g.iid} at ${TIER_META[g.tierAtTime].name}${age}`;
}

/**
 * "Gate last seen !41 at Hands-off, 4.9 h ago", or "Gate not seen since 2026-09-20" when the gate decided nothing for the
 * holder since its since. Null when the gate is not read for the class (absent: a split or unheld class, or no read yet).
 */
export function gateSeenText(g: GateSeen | null | undefined, since: string | null | undefined, now: Date | null): string | null {
  if (g === undefined) return null;
  if (g) return `Gate last seen ${gateSeenWords(g, now)}`;
  return since ? `Gate not seen since ${since.slice(0, 10)}` : 'Gate not seen';
}

/** The freshest gate seen among some classes (a track's): the latest by its instant; null when none was seen. */
export function freshestGate(classes: readonly { gateSeen?: GateSeen | null }[]): GateSeen | null {
  let best: GateSeen | null = null;
  for (const c of classes) {
    const g = c.gateSeen;
    if (g && (!best || Date.parse(g.at) > Date.parse(best.at))) best = g;
  }
  return best;
}
