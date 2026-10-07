// What a class tier row means on a screen, read in one place for Fleet, the door and Ladder: a tier, no record yet, or
// a class several agents hold with each holder at its own tier (CI gates each merge request at its author's own record).
// The row stores what the gate acts on in `tier` and the standing in its move: 'no_record' is stored quarantined (the
// gate blocks it), a split class at its most restrictive holder with the holders in the move's note. A real quarantine
// (a tripwire, a revoke to quarantined) is a plain tier and reads Quarantined.
import { splitTier, type ClassCell, type Holder } from '@/lib/tiers';
import { TIER_ORDER, type Tier } from '@/schemas/tier';
import type { ClassTierRow } from '../repositories/fleet/classTier';

/** A class as the screens show it. `holders` is set only for a split class ('refused'), and has two or more. */
export interface ShownClass {
  cell: ClassCell;
  holders: Holder[] | null;
}

const isTier = (s: string | undefined): s is Tier => (TIER_ORDER as readonly string[]).includes(s ?? '');

/** The move note of a split class: "ai-qa-a=supervised, ai-qa-b=assisted". */
export const holdersNote = (holders: readonly Holder[]): string => holders.map((h) => `${h.agent}=${h.tier}`).join(', ');

/** The holders a note names; a piece that names no tier is dropped (a row written before holders had tiers). */
export const holdersOf = (note: string | null): Holder[] =>
  (note ?? '').split(',').flatMap((piece) => {
    const [agent, tier] = piece.trim().split('=');
    return agent && isTier(tier) ? [{ agent, tier }] : [];
  });

/** The one reader of a class tier row. A split row whose holders cannot be read is unknown until the next poll. */
export function shownOf(row: Pick<ClassTierRow, 'tier' | 'move'>): ShownClass {
  if (row.move?.kind === 'no_record') return { cell: 'no_record', holders: null };
  if (row.move?.kind === 'refused') {
    const holders = holdersOf(row.move.note);
    return holders.length > 1 ? { cell: 'refused', holders } : { cell: null, holders: null };
  }
  return { cell: row.tier, holders: null };
}

type Stored<T> = { tier: T; move: ClassTierRow['move'] };

/** A class no agent holds: stored quarantined, as the gate acts on it (it blocks), with the standing as its move. */
export const noRecordRow = (): Stored<'quarantined'> => ({ tier: 'quarantined', move: { kind: 'no_record', at: null, note: null } });

/** A class several agents hold: stored at its most restrictive holder, every holder in the move's note. */
export const splitRow = (holders: readonly Holder[]): Stored<Tier> => ({
  tier: splitTier(holders), move: { kind: 'refused', at: null, note: holdersNote(holders) },
});

/** The writer's side: the tier and move a row stores so that shownOf reads `shown` back. A plain tier keeps `move`. */
export function storedOf(shown: ShownClass, move: ClassTierRow['move'] = null): Pick<ClassTierRow, 'tier' | 'move'> {
  if (shown.cell === 'no_record') return noRecordRow();
  if (shown.cell === 'refused') return splitRow(shown.holders ?? []);
  return { tier: shown.cell, move };
}
