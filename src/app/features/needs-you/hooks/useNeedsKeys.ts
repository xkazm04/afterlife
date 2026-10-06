'use client';

import type { KeyboardEvent, RefObject } from 'react';
import { useHotkeys } from '@/lib/keyboard/useHotkeys';
import { useRowNavigation } from '@/components/table/useRowNavigation';
import { navItems, type VisibleGroup } from '../model/rows/grouping';
import { spaceAction } from '../model/rows/rowAction';
import type { Action, NeedsState } from '../model/types';

export interface KeyOptions {
  s: NeedsState;
  groups: readonly VisibleGroup[];
  dispatch: (a: Action) => void;
  tableRef: RefObject<HTMLDivElement | null>;
  searchRef: RefObject<HTMLInputElement | null>;
  inspectorOpen: boolean;
  setInspectorOpen: (open: boolean) => void;
  onMenuKey: (id: string) => void;
}

/**
 * The keyboard map. On the table: arrows, Home/End, Left/Right collapse, Enter opens the inspector, Space picks or
 * acts, ContextMenu opens the menu. Anywhere: "/" searches, Escape clears the search, then closes the inspector.
 */
export function useNeedsKeys(o: KeyOptions): (e: KeyboardEvent<HTMLElement>) => void {
  const { s, groups, dispatch, tableRef, searchRef, inspectorOpen, setInspectorOpen, onMenuKey } = o;
  const nav = useRowNavigation({
    items: navItems(groups),
    selected: s.sel,
    onSelect: (id) => dispatch({ type: 'select', id }),
    onToggleGroup: (id, open) => dispatch({ type: 'toggleGroup', id, open }),
    onActivate: () => setInspectorOpen(true),
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

  useHotkeys([
    {
      key: '/',
      handler: () => {
        searchRef.current?.focus();
        searchRef.current?.select();
      },
    },
    {
      key: 'Escape',
      allowInInput: true,
      handler: (e) => {
        if (e.target === searchRef.current) {
          if (s.query) dispatch({ type: 'query', query: '' });
          tableRef.current?.focus({ preventScroll: true });
        } else if (inspectorOpen) {
          setInspectorOpen(false);
          tableRef.current?.focus({ preventScroll: true });
        }
      },
    },
    { key: 'ArrowDown', allowInInput: true, preventDefault: false, handler: (e) => leaveSearch(e) },
    { key: 'Enter', allowInInput: true, preventDefault: false, handler: (e) => leaveSearch(e) },
  ]);

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
