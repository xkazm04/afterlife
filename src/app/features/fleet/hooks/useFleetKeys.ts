'use client';

import type { RefObject } from 'react';
import { useSearchKeys } from '@/components/controls/toolbar/useSearchKeys';
import { useKeymap } from '@/lib/keyboard/keymap';
import { useHotkeys } from '@/lib/keyboard/useHotkeys';
import { FLEET_KEYMAP } from '../model/keys/keymap';

/**
 * The Fleet's own keys, declared in model/keys/keymap.ts (⌘I is the Window's, the table's arrows are useRowNavigation's):
 *   /            focus the search field
 *   Esc          closes a hover card; in the search field clears it and returns to the table
 *   Down, Enter  in the search field: back to the table, selecting the first row when nothing visible is selected
 * Off while a menu is open.
 */
export function useFleetKeys(o: {
  enabled: boolean;
  searchRef: RefObject<HTMLInputElement | null>;
  tableRef: RefObject<HTMLDivElement | null>;
  query: string;
  onQuery: (q: string) => void;
  popoverOpen: boolean;
  closePopover: () => void;
  /** Called when the field hands focus back and no visible row is selected. */
  onSelectFirst: () => void;
}) {
  const inField = (e: KeyboardEvent) => e.target === o.searchRef.current;
  const toTable = () => o.tableRef.current?.focus({ preventScroll: true });
  const search = useSearchKeys({ searchRef: o.searchRef, query: o.query, clear: () => o.onQuery(''), toTable });
  useHotkeys(
    useKeymap(FLEET_KEYMAP, {
      search: search.focusSearch,
      escape: (e) => {
        if (o.popoverOpen) {
          o.closePopover();
          e.preventDefault();
        } else if (search.escape(e)) e.preventDefault();
      },
      toTable: (e) => {
        if (!inField(e)) return;
        e.preventDefault();
        toTable();
        o.onSelectFirst();
      },
    }),
    o.enabled,
  );
}
