// Needs you's document-wide keys, declared once: hooks/useNeedsKeys binds them, Settings > Keyboard lists them. Pure,
// server-safe. (The table's own keys - arrows, Home/End, Enter, Space, ContextMenu - are useRowNavigation's.)
import { defineKeymap } from '@/lib/keyboard/keymap';

const FROM_FIELD = { allowInInput: true, preventDefault: false } as const;

export const NEEDS_KEYMAP = defineKeymap('Needs you', [
  { id: 'search', keys: [{ key: '/' }], does: 'Search' },
  { id: 'escape', keys: [{ key: 'Escape', allowInInput: true }], does: 'Clear search, then close the inspector' },
  { id: 'toTable', keys: [{ key: 'ArrowDown', ...FROM_FIELD }, { key: 'Enter', ...FROM_FIELD }], does: 'From the search field, back to the table' },
]);
