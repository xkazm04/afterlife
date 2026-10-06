'use client';

import type { RefObject } from 'react';
import { useHotkeys } from '@/lib/keyboard/useHotkeys';

/**
 * The Fleet's own keys (⌘I is the Window's, the table's arrows are useRowNavigation's):
 *   /            focus the search field
 *   Esc          closes a hover card; in the search field clears it and returns to the table; otherwise closes the inspector
 *   Down, Enter  in the search field: back to the table, selecting the first row when nothing visible is selected
 * Off while a menu is open.
 */
export function useFleetKeys(o: {
  enabled: boolean;
  searchRef: RefObject<HTMLInputElement | null>;
  tableRef: RefObject<HTMLDivElement | null>;
  query: string;
  onQuery: (q: string) => void;
  inspectorOpen: boolean;
  onInspectorOpen: (open: boolean) => void;
  popoverOpen: boolean;
  closePopover: () => void;
  /** Called when the field hands focus back and no visible row is selected. */
  onSelectFirst: () => void;
}) {
  const inField = (e: KeyboardEvent) => e.target === o.searchRef.current;
  const toTable = () => o.tableRef.current?.focus({ preventScroll: true });
  useHotkeys(
    [
      {
        key: '/',
        handler: () => {
          o.searchRef.current?.focus();
          o.searchRef.current?.select();
        },
      },
      {
        key: 'Escape',
        allowInInput: true,
        preventDefault: false,
        handler: (e) => {
          if (o.popoverOpen) {
            o.closePopover();
            e.preventDefault();
          } else if (inField(e)) {
            if (o.query) o.onQuery('');
            toTable();
            e.preventDefault();
          } else if (o.inspectorOpen) {
            o.onInspectorOpen(false);
            toTable();
            e.preventDefault();
          }
        },
      },
      ...(['ArrowDown', 'Enter'] as const).map((key) => ({
        key,
        allowInInput: true,
        preventDefault: false,
        handler: (e: KeyboardEvent) => {
          if (!inField(e)) return;
          e.preventDefault();
          toTable();
          o.onSelectFirst();
        },
      })),
    ],
    o.enabled,
  );
}
