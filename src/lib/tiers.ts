// Display metadata for the five tiers. A tier is always a letter mark plus colour, never colour alone.
// Types come from the domain schemas; the fixture spells tiers the same way (hands_off, human_only, ...).
import type { Ceiling } from '@/schemas';

/** Column order on the Fleet and in legends: most autonomy first. */
export const TIER_DISPLAY_ORDER: readonly Ceiling[] = ['hands_off', 'supervised', 'assisted', 'quarantined', 'human_only'];

export const TIER_META: Record<Ceiling, { letter: string; name: string }> = {
  hands_off: { letter: 'H', name: 'Hands-off' },
  supervised: { letter: 'S', name: 'Supervised' },
  assisted: { letter: 'A', name: 'Assisted' },
  quarantined: { letter: 'Q', name: 'Quarantined' },
  human_only: { letter: 'P', name: 'Human only' },
};

/** Sort rank: higher means more autonomy. */
export const TIER_RANK: Record<Ceiling, number> = { hands_off: 5, supervised: 4, assisted: 3, quarantined: 2, human_only: 1 };

export function isCeiling(value: unknown): value is Ceiling {
  return typeof value === 'string' && value in TIER_META;
}

/**
 * The two standings in which the gate grants a class no tier, kept apart from a tripwire quarantine: 'no_record' (no
 * agent in tier-state.yml holds it yet) and 'refused' (several agents hold it and none is named for the role).
 */
export type Standing = 'no_record' | 'refused';
/** One class of one project on Fleet and the door: its tier, a standing, or null when unknown. */
export type ClassCell = Ceiling | Standing | null;

export const STANDING_META: Record<Standing, { letter: string; name: string; means: string }> = {
  no_record: { letter: '–', name: 'No record yet', means: 'no agent holds it in tier-state.yml; the gate acts on nothing' },
  refused: { letter: '!', name: 'Blocked', means: 'several agents hold it and none is named for the role; the gate refuses to pick' },
};

export const isStanding = (c: ClassCell | undefined): c is Standing => c === 'no_record' || c === 'refused';

/** The name a class cell shows: the tier's, the standing's, or "unknown". */
export const cellName = (c: ClassCell | undefined): string => (c == null ? 'unknown' : isStanding(c) ? STANDING_META[c].name : TIER_META[c].name);

/** Sort rank of a cell: a standing sits below every tier; unknown is null and sinks. */
export const cellRank = (c: ClassCell | undefined): number | null => (c == null ? null : isStanding(c) ? 0 : TIER_RANK[c]);

/**
 * Whether a project's tiers are known: it has at least one class cell that is not unknown. Read from the cells
 * themselves, never from `armed` (which counts armed tracks). Unknown tiers show as unknown, never as 0.
 */
export const tiersKnown = (p: { classTiers: Readonly<Record<string, ClassCell>> }): boolean => Object.values(p.classTiers).some((c) => c !== null);

/** How many of a project's classes are in a standing. */
export const standingCount = (p: { classTiers: Readonly<Record<string, ClassCell>> }, s: Standing): number =>
  Object.values(p.classTiers).filter((c) => c === s).length;
