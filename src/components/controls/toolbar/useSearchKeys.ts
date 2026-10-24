import type { RefObject } from 'react';

export interface SearchKeyOptions {
  /** The SearchField's input. */
  searchRef: RefObject<HTMLInputElement | null>;
  /** The screen's query now: Escape clears only a non-empty one. */
  query: string;
  /** Empty the query. */
  clear: () => void;
  /** Hand the keyboard back to the table (focus it). */
  toTable: () => void;
  /** Escape clears the query wherever focus is, not only in the field (the Ladder). The table keeps focus then. */
  clearFromAnywhere?: boolean;
}

/**
 * The search field's two document keys, one rule for every screen with a SearchField: "/" focuses the field and selects
 * its text; Escape in the field clears the query and returns to the table. `escape` answers whether it did anything, so a
 * screen can put its own Escape (a hover card) first. Bind both through the screen's keymap. The ref is read only when a
 * key is pressed.
 */
export function useSearchKeys(o: SearchKeyOptions): { focusSearch: () => void; escape: (e: KeyboardEvent) => boolean } {
  const { searchRef, query, clear, toTable, clearFromAnywhere = false } = o;
  return {
    focusSearch: () => {
      searchRef.current?.focus();
      searchRef.current?.select();
    },
    escape: (e) => {
      const inField = e.target === searchRef.current;
      if (!inField && !(clearFromAnywhere && query)) return false;
      if (query) clear();
      if (inField) toTable();
      return true;
    },
  };
}
