'use client';

import type { ReactNode, RefObject } from 'react';
import { useMenu } from '@/components/overlays/menu/useMenu';
import { isGroupNavId, rowDomId } from '@/components/table/model/rowNavigation';
import type { FleetProject } from '@/lib/demo/types';
import { gitlabUrl } from '../model/inspector';
import { groupMenu, rowMenu } from '../model/menus/contextMenus';
import { filterMenu, sortMenu } from '../model/menus/toolbarMenus';
import type { FleetData } from '../model/types';
import type { useFleetList } from './useFleetList';

export interface FleetMenusArgs {
  data: FleetData;
  list: ReturnType<typeof useFleetList>;
  byId: ReadonlyMap<string, FleetProject>;
  tableRef: RefObject<HTMLDivElement | null>;
  onOpen: (id: string) => void;
  onRepoll: (id: string) => void;
  onFlash: (message: string) => void;
}

/**
 * The three menus of the Fleet: Sort and Filter (checkable, they stay open and show what they just changed) and
 * the context menu of a row or a group. `node` goes in the tree once.
 */
export function useFleetMenus(a: FleetMenusArgs) {
  const { list, data } = a;
  const sortM = useMenu(() => sortMenu({ sort: list.sort, grouped: list.grouped, stages: data.stages, onSort: list.setSort, onToggleGroups: () => list.setGrouped((g) => !g) }));
  const filterM = useMenu(() =>
    filterMenu({
      filters: list.filters,
      onState: list.toggleState,
      onTier: list.toggleTier,
      onNeedsOnly: () => list.setSource(list.filters.source === 'needs' ? 'all' : 'needs'),
      onClear: list.clearFilters,
    }),
  );
  const ctx = useMenu();

  const copy = (path: string) => {
    const done = () => a.onFlash(`Copied ${path}`);
    const fail = () => a.onFlash(path);
    try {
      navigator.clipboard.writeText(path).then(done, fail);
    } catch {
      fail();
    }
  };

  /** Opens the menu of a row ("g:<group>" for a group row) at a point; a keyboard open highlights the first item. */
  const openRow = (id: string, x: number, y: number, keyboard = false) => {
    sortM.close();
    filterM.close();
    const returnTo = a.tableRef.current;
    if (isGroupNavId(id)) {
      const g = id.slice(2);
      const items = groupMenu({
        collapsed: list.collapsed.has(g),
        onToggle: () => list.toggleGroup(g),
        onCollapseAll: () => list.collapseAll(data.groups),
        onExpandAll: list.expandAll,
        onOnlyThis: () => list.setSource(`g:${g}`),
      });
      ctx.openAt(x, y, { items, returnTo, highlightFirst: keyboard });
      return;
    }
    const project = a.byId.get(id);
    if (!project) return;
    const items = rowMenu({
      project,
      portfolio: data.portfolio,
      collapsed: list.collapsed.has(project.group),
      grouped: list.grouped,
      onOpen: () => a.onOpen(id),
      onRepoll: () => a.onRepoll(id),
      onCopy: copy,
      onReveal: (path) => a.onFlash(`${gitlabUrl(path)} (demo, no network)`),
      onToggleGroup: () => list.toggleGroup(project.group),
    });
    ctx.openAt(x, y, { items, returnTo, highlightFirst: keyboard });
  };

  /** The context-menu key on the selected row: opens under its left edge. */
  const openRowAtKey = (id: string) => {
    const el = document.getElementById(rowDomId(id));
    const r = el?.getBoundingClientRect();
    if (r) openRow(id, r.left + 40, r.bottom, true);
  };

  const node: ReactNode = (
    <>
      {sortM.menu}
      {filterM.menu}
      {ctx.menu}
    </>
  );
  return {
    node,
    isOpen: sortM.isOpen || filterM.isOpen || ctx.isOpen,
    openSort: (el: HTMLElement) => {
      ctx.close();
      filterM.close();
      sortM.openFrom(el);
    },
    openFilter: (el: HTMLElement) => {
      ctx.close();
      sortM.close();
      filterM.openFrom(el);
    },
    openRow,
    openRowAtKey,
  };
}
