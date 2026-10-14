'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { nextSort, type SortState } from '@/components/table/model/sort';
import type { FleetProject, ProjectState, TierKey } from '@/lib/demo/types';
import { EMPTY_FILTERS, filterCount, filterProjects, toggleIn } from '../model/list/filtering';
import { INITIAL_SORT, defaultDir, sortAfterViewChange, sortProjects } from '../model/list/sorting';
import { DEFAULT_LIST_STATE, encodeListState, type FleetListState } from '../model/list/urlState';
import { groupBlocks, navItems } from '../model/groups';
import type { FleetFilters, FleetView, SortKey, Source } from '../model/types';

/**
 * What the list shows and how: the view, the sort, grouping and collapsed groups, and the filters. It returns the
 * visible projects (filtered, then sorted), their group blocks and the rows the keyboard walks.
 */
export function useFleetList(projects: readonly FleetProject[], groups: readonly string[], start: FleetListState = DEFAULT_LIST_STATE) {
  const [view, setViewState] = useState<FleetView>(start.view);
  const [sort, setSort] = useState<SortState<SortKey>>(start.sort);
  const toggleSort = useCallback((key: SortKey) => setSort((s) => nextSort(s, key, { initial: INITIAL_SORT, defaultDir })), []);
  const [grouped, setGrouped] = useState(start.grouped);
  const [collapsed, setCollapsed] = useState<ReadonlySet<string>>(() => new Set(start.collapsed));
  const [filters, setFilters] = useState<FleetFilters>(start.filters);

  // The state lives in the URL (replace, never push) so Back from a project and a reload restore it; the default is a clean URL.
  const query = encodeListState({ view, sort, grouped, collapsed, filters });
  useEffect(() => {
    if (window.location.search.replace(/^\?/, '') === query) return;
    window.history.replaceState(window.history.state, '', query ? `?${query}` : window.location.pathname);
  }, [query]);

  const visible = useMemo(() => sortProjects(filterProjects(projects, filters), sort), [projects, filters, sort]);
  const blocks = useMemo(() => groupBlocks(groups, visible), [groups, visible]);
  const nav = useMemo(() => navItems(blocks, collapsed, grouped, visible), [blocks, collapsed, grouped, visible]);

  const setView = useCallback((v: FleetView) => {
    setViewState(v);
    setSort((s) => sortAfterViewChange(s, v));
  }, [setSort]);

  const patch = useCallback((p: Partial<FleetFilters>) => setFilters((f) => ({ ...f, ...p })), []);
  const setGroupOpen = useCallback(
    (group: string, open: boolean) =>
      setCollapsed((c) => {
        const next = new Set(c);
        if (open) next.delete(group);
        else next.add(group);
        return next;
      }),
    [],
  );

  return {
    view, setView, sort, toggleSort, setSort, grouped, setGrouped, collapsed, filters, visible, blocks, nav,
    filterTotal: filterCount(filters),
    setSource: (source: Source) => patch({ source }),
    setQuery: (q: string) => patch({ q }),
    toggleState: (s: ProjectState) => setFilters((f) => ({ ...f, states: toggleIn(f.states, s) })),
    toggleTier: (t: TierKey) => setFilters((f) => ({ ...f, tiers: toggleIn(f.tiers, t) })),
    clearFilters: () => setFilters(EMPTY_FILTERS),
    setGroupOpen,
    toggleGroup: (group: string) => setGroupOpen(group, collapsed.has(group)),
    collapseAll: (groups: readonly string[]) => setCollapsed(new Set(groups)),
    expandAll: () => setCollapsed(new Set()),
  };
}
