// The film's keys, declared once: hooks/useFilmKeys binds them, Settings > Keyboard lists them. Pure, server-safe.
// The film listens on the whole page itself (any key skips the intro), so it reads this declaration instead of bindKeymap.
import { defineKeymap } from '@/lib/keyboard/keymap';

export const ABOUT_KEYMAP = defineKeymap('About', [
  { id: 'skip', keys: [{ key: 'Enter' }], does: 'Skip the intro (any key does)' },
  { id: 'prev', keys: [{ key: 'ArrowLeft' }], does: 'Previous beat' },
  { id: 'next', keys: [{ key: 'ArrowRight' }], does: 'Next beat' },
  { id: 'ends', keys: [{ key: 'Home' }, { key: 'End' }], does: 'First / last beat' },
  { id: 'play', keys: [{ key: ' ' }], does: 'Play / pause' },
  { id: 'leave', keys: [{ key: 'Escape' }], does: 'Back to the door, or enter Afterlife (/fleet)' },
]);

/** The key a declared entry binds, by id and position (the hook's scrub table is built from these). */
export const aboutKey = (id: (typeof ABOUT_KEYMAP.entries)[number]['id'], i = 0): string => {
  const k = ABOUT_KEYMAP.entries.find((e) => e.id === id)?.keys[i];
  return typeof k === 'string' ? k : (k?.key ?? '');
};
