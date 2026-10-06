'use client';

import { useCallback, useEffect, type KeyboardEvent, type RefObject } from 'react';
import { isTypeAhead, navigate, rowDomId, type NavItem } from './model/rowNavigation';

export interface RowNavigationOptions {
  /** The visible rows in order: groups ("g:" ids) and rows. Collapsed groups contribute no children. */
  items: readonly NavItem[];
  selected: string | null;
  onSelect: (id: string) => void;
  onToggleGroup: (groupId: string, open: boolean) => void;
  /** Enter on a row (open the inspector). */
  onActivate?: (id: string) => void;
  /** The ContextMenu key or Shift+F10 on the selected row. */
  onContextMenuKey?: (id: string) => void;
  /** A printable key was typed on the table: start a search with it. */
  onTypeAhead?: (char: string) => void;
  /** The table element (the `tableRef` you gave OutlineTable), used to scroll the selection into view. */
  tableRef: RefObject<HTMLDivElement | null>;
  /** True when rows sit under sticky group rows (the scroll offset needs them). */
  grouped?: boolean;
}

/**
 * Keyboard and scroll behaviour of a treegrid. Pass the returned `onKeyDown` to OutlineTable. The selected row is
 * scrolled into view below the sticky header (and group row) whenever the selection changes.
 */
export function useRowNavigation(o: RowNavigationOptions) {
  const { items, selected, onSelect, onToggleGroup, onActivate, onContextMenuKey, onTypeAhead, tableRef, grouped } = o;

  useEffect(() => {
    const tbl = tableRef.current;
    if (!tbl || !selected) return;
    const el = document.getElementById(rowDomId(selected));
    if (!el) return;
    const head = tbl.querySelector<HTMLElement>('[data-part="thead"]')?.offsetHeight ?? 0;
    const isGroup = selected.startsWith('g:');
    const groupH = grouped && !isGroup ? (tbl.querySelector<HTMLElement>('[data-part="group-row"]')?.offsetHeight ?? 0) : 0;
    const tr = tbl.getBoundingClientRect();
    const r = el.getBoundingClientRect();
    const top = tr.top + head + groupH;
    if (r.top < top) tbl.scrollTop -= top - r.top;
    else if (r.bottom > tr.bottom - 2) tbl.scrollTop += r.bottom - tr.bottom + 2;
  }, [selected, grouped, tableRef]);

  return useCallback(
    (e: KeyboardEvent<HTMLElement>) => {
      if (e.target !== e.currentTarget) return;
      if (e.key === 'ContextMenu' || (e.key === 'F10' && e.shiftKey)) {
        if (selected) onContextMenuKey?.(selected);
        e.preventDefault();
        return;
      }
      const action = navigate(items, selected, e.key);
      if (action.type === 'none') {
        if (onTypeAhead && isTypeAhead(e)) {
          onTypeAhead(e.key);
          e.preventDefault();
        }
        return;
      }
      if (action.type === 'select') onSelect(action.id);
      else if (action.type === 'toggle') onToggleGroup(action.id.slice(2), action.open);
      else onActivate?.(action.id);
      e.preventDefault();
    },
    [items, selected, onSelect, onToggleGroup, onActivate, onContextMenuKey, onTypeAhead],
  );
}
