import { describe, expect, it } from 'vitest';
import { NEEDS_KEYMAP } from './keymap';

const does = (id: string) => NEEDS_KEYMAP.entries.find((e) => e.id === id)?.does ?? '';

describe('NEEDS_KEYMAP says what hooks/useNeedsKeys binds', () => {
  it('Escape clears the search and hands the keyboard back to the table: the list screen has no inspector to close', () => {
    expect(does('escape')).not.toMatch(/inspector/i);
    expect(does('escape')).toMatch(/clear search/i);
    expect(does('escape')).toMatch(/table/i);
  });
});
