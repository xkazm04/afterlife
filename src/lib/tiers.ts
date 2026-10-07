// Display metadata for the five tiers. A tier is always a letter mark plus colour, never colour alone.
// Types come from the domain schemas; the fixture spells tiers the same way (hands_off, human_only, ...).
import { TIER_ORDER, type Ceiling, type Tier } from '@/schemas/tier';

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
 * The two standings a class cell can hold besides a tier, kept apart from a tripwire quarantine: 'no_record' (no agent
 * in tier-state.yml holds it yet: the gate blocks it) and 'refused' (several agents hold it: CI gates each merge request
 * at its author's own record, so the class has one tier per holder; the key keeps the name the index stores it under).
 */
export type Standing = 'no_record' | 'refused';
/** One class of one project on Fleet and the door: its tier, a standing, or null when unknown. */
export type ClassCell = Ceiling | Standing | null;

/** One holder of a class several agents hold: the tier gate({..., agent}) grants a merge request it authored. */
export interface Holder {
  agent: string;
  tier: Tier;
}

// The holders travel beside the cell: the fixture's types (src/lib/demo/types.ts) keep their shape, and the demo has none.
declare module '@/lib/demo/types' {
  interface FleetProject {
    /** Each class whose cell is 'refused': every holder at its own tier. Absent when no class is split. */
    holders?: Readonly<Record<string, readonly Holder[]>>;
  }
  interface ActionClass {
    /** What Ladder shows: absent in the demo fixture, where the class's `tier` is its cell. */
    cell?: ClassCell;
    holders?: readonly Holder[];
  }
}

export const STANDING_META: Record<Standing, { letter: string; name: string; means: string }> = {
  no_record: { letter: '–', name: 'No record yet', means: 'no agent holds it in tier-state.yml; the gate acts on nothing' },
  refused: { letter: '÷', name: 'Split', means: "several agents hold it; CI gates each merge request at its author's own tier" },
};

export const isStanding = (c: ClassCell | undefined): c is Standing => c === 'no_record' || c === 'refused';

/** The most restrictive tier among a split class's holders: what a one-letter summary shows. */
export const splitTier = (holders: readonly Holder[]): Tier =>
  holders.reduce<Tier>((low, h) => (TIER_ORDER.indexOf(h.tier) < TIER_ORDER.indexOf(low) ? h.tier : low), 'hands_off');

/** "ai-qa-a Supervised · ai-qa-b Assisted". */
export const holdersText = (holders: readonly Holder[]): string => holders.map((h) => `${h.agent} ${TIER_META[h.tier].name}`).join(' · ');

const splitKnown = (c: ClassCell | undefined, holders: readonly Holder[] | undefined): holders is readonly Holder[] =>
  c === 'refused' && !!holders?.length;

/** The name a class cell shows: the tier's, the standing's (a split one with each holder's tier), or "unknown". */
export const cellName = (c: ClassCell | undefined, holders?: readonly Holder[]): string => {
  if (c == null) return 'unknown';
  if (splitKnown(c, holders)) return `Split: ${holdersText(holders)}`;
  return isStanding(c) ? STANDING_META[c].name : TIER_META[c].name;
};

/** A cell as letters: the tier's, the standing's, a split class's most restrictive holder then "÷", or "?" for unknown. */
export const cellLetter = (c: ClassCell | undefined, holders?: readonly Holder[]): string => {
  if (c == null) return '?';
  if (splitKnown(c, holders)) return `${TIER_META[splitTier(holders)].letter}${STANDING_META.refused.letter}`;
  return isStanding(c) ? STANDING_META[c].letter : TIER_META[c].letter;
};

/** Sort rank of a cell: a split class ranks at its most restrictive holder, a standing below every tier; unknown is null. */
export const cellRank = (c: ClassCell | undefined, holders?: readonly Holder[]): number | null => {
  if (c == null) return null;
  if (splitKnown(c, holders)) return TIER_RANK[splitTier(holders)];
  return isStanding(c) ? 0 : TIER_RANK[c];
};

/**
 * Whether a project's tiers are known: it has at least one class cell that is not unknown. Read from the cells
 * themselves, never from `armed` (which counts armed tracks). Unknown tiers show as unknown, never as 0.
 */
export const tiersKnown = (p: { classTiers: Readonly<Record<string, ClassCell>> }): boolean => Object.values(p.classTiers).some((c) => c !== null);

/** How many of a project's classes are in a standing. */
export const standingCount = (p: { classTiers: Readonly<Record<string, ClassCell>> }, s: Standing): number =>
  Object.values(p.classTiers).filter((c) => c === s).length;
