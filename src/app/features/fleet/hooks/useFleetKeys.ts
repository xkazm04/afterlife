'use client';

import type { RefObject } from 'react';
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
  useHotkeys(
    useKeymap(FLEET_KEYMAP, {
      search: () => {
        o.searchRef.current?.focus();
        o.searchRef.current?.select();
      },
      escape: (e) => {
        if (o.popoverOpen) {
          o.closePopover();
          e.preventDefault();
        } else if (inField(e)) {
          if (o.query) o.onQuery('');
          toTable();
          e.preventDefault();
        }
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
