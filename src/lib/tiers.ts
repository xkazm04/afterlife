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
