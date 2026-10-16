// The Ladder's document-wide keys, declared once: hooks/useLadderKeys binds them, Settings > Keyboard lists them. Pure,
// server-safe. One tier key per tier in TIER_DISPLAY_ORDER, so a new tier adds its key and its row together.
import { defineKeymap } from '@/lib/keyboard/keymap';
import { TIER_DISPLAY_ORDER } from '@/lib/tiers';

export const LADDER_KEYMAP = defineKeymap('Ladder', [
  { id: 'step', keys: [{ key: 'j' }, { key: 'k' }], does: 'Next / previous class' },
  { id: 'search', keys: [{ key: '/' }], does: 'Search' },
  { id: 'tier', keys: [{ key: '0' }, ...TIER_DISPLAY_ORDER.map((_, i) => ({ key: String(i + 1) }))], does: 'All tiers / filter to one tier' },
  { id: 'promote', keys: [{ key: 'p' }], does: 'Promote' },
  { id: 'revoke', keys: [{ key: 'r' }, { key: 'q' }], does: 'Revoke a step / quarantine: the class, or on a track header every class of the track in one commit' },
  { id: 'help', keys: [{ key: '?' }], does: 'Legend' },
  { id: 'escape', keys: [{ key: 'Escape', allowInInput: true }], does: 'Clear search, then close the inspector' },
]);
