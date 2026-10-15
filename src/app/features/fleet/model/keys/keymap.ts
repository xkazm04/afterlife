// The Fleet's own keys, declared once: hooks/useFleetKeys binds them, Settings > Keyboard lists them. Pure, server-safe.
// (Cmd/Ctrl+I is the Window's; the table's arrows are useRowNavigation's.)
import { defineKeymap } from '@/lib/keyboard/keymap';

const FROM_FIELD = { allowInInput: true, preventDefault: false } as const;

export const FLEET_KEYMAP = defineKeymap('Fleet', [
  { id: 'search', keys: [{ key: '/' }], does: 'Search' },
  { id: 'escape', keys: [{ key: 'Escape', ...FROM_FIELD }], does: 'Clear search, close the popover, then the inspector' },
  { id: 'toTable', keys: [{ key: 'ArrowDown', ...FROM_FIELD }, { key: 'Enter', ...FROM_FIELD }], does: 'From the search field, back to the table' },
]);
