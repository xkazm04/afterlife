'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { usePopover } from '@/components/overlays/popover/usePopover';
import { useToast } from '@/components/overlays/toast/useToast';
import { Reveal, useHostNav, type SliceState } from '@/components/shell/host';
import { Window } from '@/components/shell/Window';
import { useRowNavigation } from '@/components/table/useRowNavigation';
import { FleetLegend } from './components/legend/FleetLegend';
import { FleetSidebar } from './components/sidebar/FleetSidebar';
import { FleetStatus } from './components/FleetStatus';
import { FleetStatusPending, TablePending } from './components/FleetPending';
import { FleetTable } from './components/table/FleetTable';
import { FleetToolbar } from './components/toolbar/FleetToolbar';
import { FleetPane } from './components/runner/RunnerSlot';
import { useFleetChanges } from './hooks/changes/useFleetChanges';
import { useEvent } from './hooks/useEvent';
import { useFleetKeys } from './hooks/useFleetKeys';
import { useFleetList } from './hooks/useFleetList';
import { useFleetMenus } from './hooks/useFleetMenus';
import { useFleetProjects } from './hooks/useFleetProjects';
import { useNarrow } from './hooks/useNarrow';
import { useRepoll } from './hooks/useRepoll';
import { useRowHandlers } from './hooks/useRowHandlers';
import { useToolbarCompact } from './hooks/useToolbarCompact';
import type { Baseline } from './model/changes/baseline';
import { menuFilterCount, sourceLabel } from './model/list/filtering';
import { sortLabel } from './model/list/sorting';
import { DEFAULT_LIST_STATE, type FleetListState } from './model/list/urlState';
import type { FleetDesk } from './model/screen/slices';
import { fitKey, fitList, UNREAD_FLEET } from './model/screen/unread';
import type { FleetData, FleetEstate, FleetMeta, FleetSource, Source } from './model/types';
import { fleetHref } from '@/lib/url/fleetHref';

export interface FleetScreenProps {
  /** The fleet; absent until read (the screen host's core slice): the same window, a dash for every count. */
  data?: FleetData;
  source?: FleetSource;
  /** The list state the URL asks for; a new one (back, forward, a link) is taken when the list does not show it already. */
  start?: FleetListState;
  baseline?: Baseline | null;
  /** The cycle runner's strip (its slice); absent: no strip at all. */
  desk?: SliceState<FleetDesk>;
  /** Read beside the projects (spend, stability, trend), one object the table's group rows sum; each part null until read. */
  estate?: FleetEstate;
  /** Why the fleet could not be read. */
  coreError?: string;
  /** A live re-poll resolved: re-read the screen. */
  onPolled?: () => void;
}

/**
 * Fleet: every project as one row, by tier counts, by action class or by stage. Open a row (click its name, Enter) for the project's page,
 * right-click for actions, press a tier header to rank by it. `source` says which data source drew it and carries the
 * deep project's recent events. Nothing here writes, but the viewer's last look (model/changes; `baseline` replaces the
 * stored one, for tests). The screen host draws it from three slices (screen/host.tsx) and it paints before any of them.
 */
export function FleetScreen({ data, source, start, baseline, desk, estate, coreError, onPolled }: FleetScreenProps) {
  const { status } = useToast();
  const tableRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const fleet = data ?? UNREAD_FLEET;
  const read = data !== undefined;
  const meta = useMemo<FleetMeta>(() => ({ classes: fleet.classes, stages: fleet.stages, tiers: fleet.tiers }), [fleet]);
  const proj = useFleetProjects(fleet.projects);
  const changes = useFleetChanges(proj.projects, baseline, undefined, read);
  const list = useFleetList(proj.projects, fleet.groups, start ?? DEFAULT_LIST_STATE, changes.ids, (s) => fitList(s, data), fitKey(data));
  const pop = usePopover(380);
  const narrow = useNarrow(tableRef);
  const compact = useToolbarCompact(searchRef);
  const mode = source?.mode ?? 'demo';
  const [sel, setSel] = useState<string | null>(data?.deepId ?? null);
  const repoll = useRepoll(mode, proj.byId, proj.poll, status, onPolled);
  // A fresh snapshot (the first read, a live re-poll, a re-read on return) restarts the poll counter from its age; the
  // first one also picks the deep project, unless a row was picked meanwhile.
  const [snap, setSnap] = useState({ data, n: 0 });
  if (snap.data !== data) {
    if (!snap.data && data) setSel((s) => s ?? data.deepId);
    setSnap({ data, n: snap.n + 1 });
  }

  useEffect(() => tableRef.current?.focus({ preventScroll: true }), []);

  const { navigate } = useHostNav();
  // A project opens its page; a group row only takes the selection (its expand and collapse is the arrows').
  const open = useEvent((id: string) => {
    setSel(id);
    if (!id.startsWith('g:')) navigate(fleetHref(id));
  });
  const menus = useFleetMenus({ data: fleet, mode, list, byId: proj.byId, tableRef, onOpen: open, onRepoll: repoll, onFlash: status });

  const handlers = useRowHandlers({ data: fleet, list, menus, pop, onSelect: setSel, onActivate: open });

  const onKeyDown = useRowNavigation({
    items: list.nav,
    selected: sel,
    onSelect: setSel,
    onToggleGroup: list.setGroupOpen,
    onActivate: open,
    onContextMenuKey: (id) => {
      pop.close();
      menus.openRowAtKey(id);
    },
    onTypeAhead: (ch) => {
      list.setQuery(list.filters.q + ch);
      searchRef.current?.focus();
    },
    tableRef,
    grouped: list.grouped,
  });

  useFleetKeys({
    enabled: !menus.isOpen, searchRef, tableRef, query: list.filters.q, onQuery: list.setQuery, popoverOpen: pop.isOpen, closePopover: pop.close,
    onSelectFirst: () => {
      if (!list.nav.some((i) => i.id === sel)) setSel(list.nav.find((i) => i.kind === 'row')?.id ?? null);
    },
  });

  const pickSource = (s: Source) => {
    list.setSource(s);
    if (tableRef.current) tableRef.current.scrollTop = 0;
  };
  const markSeen = () => {
    changes.markSeen();
    if (list.filters.source === 'changed') pickSource('all');
  };

  const table = (
    <FleetTable
      view={list.view}
      narrow={narrow}
      sort={list.sort}
      onSort={list.toggleSort}
      meta={meta}
      blocks={list.blocks}
      visible={list.visible}
      grouped={list.grouped}
      collapsed={list.collapsed}
      selected={sel}
      menuing={menus.isOpen}
      tableRef={tableRef}
      onKeyDown={onKeyDown}
      handlers={handlers}
      marks={changes.marks}
      fleetEmpty={proj.projects.length === 0}
      nothingChanged={list.filters.source === 'changed' && changes.count === 0}
      estate={estate}
      pending={read ? undefined : <TablePending reason={coreError} />}
    />
  );

  return (
    <Window
      title="Belay"
      subtitle={`${read ? fleet.portfolio : '—'} · ${sourceLabel(list.filters.source)}`}
      toolbar={
        <FleetToolbar
          view={list.view}
          onView={list.setView}
          projects={proj.projects}
          waiting={proj.waiting}
          compact={compact}
          source={list.filters.source}
          onSource={pickSource}
          sortLabel={sortLabel(list.sort.key, fleet.stages)}
          onSortMenu={(el) => (pop.close(), menus.openSort(el))}
          sortOpen={menus.sortOpen}
          filterOpen={menus.filterOpen}
          filterCount={menuFilterCount(list.filters)}
          onFilterMenu={(el) => (pop.close(), menus.openFilter(el))}
          query={list.filters.q}
          onQuery={list.setQuery}
          searchRef={searchRef}
          unread={!read}
        />
      }
      sidebar={
        <Reveal order={1} slice="core">
          <FleetSidebar projects={proj.projects} groups={fleet.groups} source={list.filters.source} onSource={pickSource} changed={changes.count} onMarkSeen={markSeen} unread={!read} />
        </Reveal>
      }
      status={
        read ? (
          <FleetStatus key={snap.n} shown={list.visible.length} total={proj.projects.length} filters={list.filterTotal} startSec={fleet.lastPollSec} live={mode === 'live'} trend={estate?.trend} />
        ) : (
          <FleetStatusPending filters={list.filterTotal} />
        )
      }
      help={<FleetLegend tiers={fleet.tiers} />}
      helpTitle="Legend"
    >
      <FleetPane desk={desk}>{table}</FleetPane>
      {menus.node}
      {pop.popover}
    </Window>
  );
}
