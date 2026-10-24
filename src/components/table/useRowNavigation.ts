'use client';

import { useCallback, useEffect, type KeyboardEvent, type RefObject } from 'react';
import { DEFAULT_PAGE, isTypeAhead, navigate, pageRows, revealDelta, rowDomId, type NavItem } from './model/rowNavigation';

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

/** Px of sticky header (and, under a group, the sticky group row) that cover the top of the scrolling table. */
function coverOf(tbl: HTMLElement, selected: string, grouped: boolean | undefined): number {
  const head = tbl.querySelector<HTMLElement>('[data-part="thead"]')?.offsetHeight ?? 0;
  const groupH = grouped && !selected.startsWith('g:') ? (tbl.querySelector<HTMLElement>('[data-part="group-row"]')?.offsetHeight ?? 0) : 0;
  return head + groupH;
}

/** The PageUp / PageDown step for the table as it is sized now: the rows that show (pageRows). */
function pageOf(tbl: HTMLElement | null, selected: string | null, grouped: boolean | undefined): number {
  if (!tbl || !selected) return DEFAULT_PAGE;
  const row = document.getElementById(rowDomId(selected))?.offsetHeight ?? 0;
  return pageRows(tbl.clientHeight, coverOf(tbl, selected, grouped), row);
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
    const delta = revealDelta(el.getBoundingClientRect(), { rect: tbl.getBoundingClientRect(), clientTop: tbl.clientTop, clientHeight: tbl.clientHeight }, coverOf(tbl, selected, grouped));
    if (delta) tbl.scrollTop += delta;
  }, [selected, grouped, tableRef]);

  return useCallback(
    (e: KeyboardEvent<HTMLElement>) => {
      if (e.target !== e.currentTarget) return;
      if (e.key === 'ContextMenu' || (e.key === 'F10' && e.shiftKey)) {
        if (selected) onContextMenuKey?.(selected);
        e.preventDefault();
        return;
      }
      const page = e.key === 'PageDown' || e.key === 'PageUp' ? pageOf(tableRef.current, selected, grouped) : DEFAULT_PAGE;
      const action = navigate(items, selected, e.key, page);
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
    [items, selected, onSelect, onToggleGroup, onActivate, onContextMenuKey, onTypeAhead, tableRef, grouped],
  );
}
