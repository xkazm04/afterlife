'use client';

import { useCallback, useMemo, useState } from 'react';
import { useSort } from '@/components/table/useSort';
import type { FleetProject, ProjectState, TierKey } from '@/lib/demo/types';
import { EMPTY_FILTERS, filterCount, filterProjects, toggleIn } from '../model/list/filtering';
import { INITIAL_SORT, defaultDir, sortAfterViewChange, sortProjects } from '../model/list/sorting';
import { groupBlocks, navItems } from '../model/groups';
import type { FleetFilters, FleetView, SortKey, Source } from '../model/types';

/**
 * What the list shows and how: the view, the sort, grouping and collapsed groups, and the filters. It returns the
 * visible projects (filtered, then sorted), their group blocks and the rows the keyboard walks.
 */
export function useFleetList(projects: readonly FleetProject[], groups: readonly string[]) {
  const [view, setViewState] = useState<FleetView>('tiers');
  const { sort, toggle: toggleSort, set: setSort } = useSort<SortKey>({ initial: INITIAL_SORT, defaultDir });
  const [grouped, setGrouped] = useState(true);
  const [collapsed, setCollapsed] = useState<ReadonlySet<string>>(() => new Set());
  const [filters, setFilters] = useState<FleetFilters>(EMPTY_FILTERS);

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
