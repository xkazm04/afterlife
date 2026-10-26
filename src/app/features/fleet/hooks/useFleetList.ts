'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { nextSort, type SortState } from '@/components/table/model/sort';
import type { FleetProject, ProjectState, TierKey } from '@/lib/demo/types';
import { EMPTY_FILTERS, filterCount, filterProjects, toggleIn } from '../model/list/filtering';
import { INITIAL_SORT, defaultDir, sortAfterViewChange, sortProjects } from '../model/list/sorting';
import { DEFAULT_LIST_STATE, decodeListState, encodeListState, type FleetListState } from '../model/list/urlState';
import { groupBlocks, navItems } from '../model/groups';
import { listReseed } from '../model/screen/unread';
import { replaceQuery } from '../screen/url';
import type { FleetFilters, FleetView, SortKey, Source } from '../model/types';

const same = (s: FleetListState): FleetListState => s;

/** The address bar's list query while it shows /fleet (canonical, as encodeListState writes it); elsewhere unknown. */
const urlQuery = (): string | undefined =>
  typeof window === 'undefined' || window.location.pathname !== '/fleet' ? undefined : encodeListState(decodeListState(new URLSearchParams(window.location.search)));

/**
 * What the list shows and how: the view, the sort, grouping and collapsed groups, and the filters. It returns the
 * visible projects (filtered, then sorted), their group blocks and the rows the keyboard walks. `changed` is what the
 * Changed source lists (the ids that moved since the last look).
 *
 * The state starts from `from` (the URL's) and follows it: when `from` says something new that the list does not already
 * show (back or forward between two /fleet?.. entries, a link to another filter), the list takes it. `fit` drops what
 * the fleet does not have (a renamed group, a dropped column); it runs again when `fitKey` changes (the fleet landed),
 * on the state as it is then, so a person's choices made meanwhile are kept.
 */
export function useFleetList(
  projects: readonly FleetProject[],
  groups: readonly string[],
  from: FleetListState = DEFAULT_LIST_STATE,
  changed?: ReadonlySet<string>,
  fit: (s: FleetListState) => FleetListState = same,
  fitKey = '',
) {
  const [st, setSt] = useState<FleetListState>(() => fit(from));
  const fromQuery = encodeListState(from);
  const [seen, setSeen] = useState({ q: fromQuery, fit: fitKey });
  const reseed = listReseed(seen, fromQuery, fitKey, encodeListState(st), urlQuery());
  if (reseed) {
    setSeen({ q: fromQuery, fit: fitKey });
    if (reseed === 'from') setSt(fit(from));
    else setSt((s) => fit(s));
  }
  const { view, sort, grouped, collapsed, filters } = st;
  // Only a person's own change writes the URL: until then the URL is the source (a hard load hydrates with the default
  // state before the host has read the query, and must not write that default over the URL).
  const touched = useRef(false);
  const patchSt = useCallback((p: (s: FleetListState) => Partial<FleetListState>) => {
    touched.current = true;
    setSt((s) => ({ ...s, ...p(s) }));
  }, []);

  // The state lives in the URL (replace, never push) so Back from a project and a reload restore it; the default is a clean URL.
  const query = encodeListState(st);
  useEffect(() => {
    if (!touched.current || window.location.search.replace(/^\?/, '') === query) return;
    replaceQuery(query);
  }, [query]);

  const visible = useMemo(() => sortProjects(filterProjects(projects, filters, changed), sort), [projects, filters, sort, changed]);
  const blocks = useMemo(() => groupBlocks(groups, visible), [groups, visible]);
  const nav = useMemo(() => navItems(blocks, collapsed, grouped, visible), [blocks, collapsed, grouped, visible]);

  const setView = useCallback((v: FleetView) => patchSt((s) => ({ view: v, sort: sortAfterViewChange(s.sort, v) })), [patchSt]);
  const setSort = useCallback(
    (next: SortState<SortKey> | ((s: SortState<SortKey>) => SortState<SortKey>)) => patchSt((s) => ({ sort: typeof next === 'function' ? next(s.sort) : next })),
    [patchSt],
  );
  const toggleSort = useCallback((key: SortKey) => setSort((s) => nextSort(s, key, { initial: INITIAL_SORT, defaultDir })), [setSort]);
  const setGrouped = useCallback((g: boolean | ((g: boolean) => boolean)) => patchSt((s) => ({ grouped: typeof g === 'function' ? g(s.grouped) : g })), [patchSt]);
  const setFilters = useCallback((f: (f: FleetFilters) => FleetFilters) => patchSt((s) => ({ filters: f(s.filters) })), [patchSt]);
  const setCollapsed = useCallback((c: (c: ReadonlySet<string>) => ReadonlySet<string>) => patchSt((s) => ({ collapsed: c(s.collapsed) })), [patchSt]);
  const patch = useCallback((p: Partial<FleetFilters>) => setFilters((f) => ({ ...f, ...p })), [setFilters]);
  const setGroupOpen = useCallback(
    (group: string, open: boolean) =>
      setCollapsed((c) => {
        const next = new Set(c);
        if (open) next.delete(group);
        else next.add(group);
        return next;
      }),
    [setCollapsed],
  );

  return {
    view, setView, sort, toggleSort, setSort, grouped, setGrouped, collapsed, filters, visible, blocks, nav,
    filterTotal: filterCount(filters),
    setSource: (source: Source) => patch({ source }),
    setQuery: (q: string) => patch({ q }),
    toggleState: (s: ProjectState) => setFilters((f) => ({ ...f, states: toggleIn(f.states, s) })),
    toggleTier: (t: TierKey) => setFilters((f) => ({ ...f, tiers: toggleIn(f.tiers, t) })),
    clearFilters: () => setFilters(() => EMPTY_FILTERS),
    setGroupOpen,
    toggleGroup: (group: string) => setGroupOpen(group, collapsed.has(group)),
    collapseAll: (groups: readonly string[]) => setCollapsed(() => new Set(groups)),
    expandAll: () => setCollapsed(() => new Set()),
  };
}
