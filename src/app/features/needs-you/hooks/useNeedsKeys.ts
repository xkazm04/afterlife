'use client';

import type { KeyboardEvent, RefObject } from 'react';
import { useKeymap } from '@/lib/keyboard/keymap';
import { useHotkeys } from '@/lib/keyboard/useHotkeys';
import { useRowNavigation } from '@/components/table/useRowNavigation';
import { NEEDS_KEYMAP } from '../model/keys/keymap';
import { navItems, type VisibleGroup } from '../model/rows/grouping';
import { spaceAction } from '../model/rows/rowAction';
import type { Action, NeedsState } from '../model/types';

export interface KeyOptions {
  s: NeedsState;
  groups: readonly VisibleGroup[];
  dispatch: (a: Action) => void;
  tableRef: RefObject<HTMLDivElement | null>;
  searchRef: RefObject<HTMLInputElement | null>;
  /** Enter on a row: its page. */
  onActivate: (id: string) => void;
  onMenuKey: (id: string) => void;
}

/**
 * The keyboard map. On the table: arrows, Home/End, Left/Right collapse, Enter opens the decision's page, Space picks or
 * acts, ContextMenu opens the menu. Anywhere (model/keys/keymap.ts): "/" searches, Escape clears the search.
 */
export function useNeedsKeys(o: KeyOptions): (e: KeyboardEvent<HTMLElement>) => void {
  const { s, groups, dispatch, tableRef, searchRef, onActivate, onMenuKey } = o;
  const nav = useRowNavigation({
    items: navItems(groups),
    selected: s.sel,
    onSelect: (id) => dispatch({ type: 'select', id }),
    onToggleGroup: (id, open) => dispatch({ type: 'toggleGroup', id, open }),
    onActivate,
    onContextMenuKey: onMenuKey,
    tableRef,
    grouped: true,
  });

  /** ArrowDown or Enter in the search box hands the keyboard back to the table. */
  const leaveSearch = (e: globalThis.KeyboardEvent) => {
    if (e.target !== searchRef.current) return;
    e.preventDefault();
    tableRef.current?.focus({ preventScroll: true });
  };

  const focusSearch = () => {
    searchRef.current?.focus();
    searchRef.current?.select();
  };
  const escape = (e: globalThis.KeyboardEvent) => {
    if (e.target !== searchRef.current) return;
    if (s.query) dispatch({ type: 'query', query: '' });
    tableRef.current?.focus({ preventScroll: true });
  };

  useHotkeys(useKeymap(NEEDS_KEYMAP, { search: focusSearch, escape, toTable: leaveSearch }));

  return (e) => {
    if (e.key === ' ' && e.target === e.currentTarget) {
      const action = spaceAction(s, s.sel);
      if (action) dispatch({ type: 'act', action });
      e.preventDefault();
      return;
    }
    nav(e);
  };
}
