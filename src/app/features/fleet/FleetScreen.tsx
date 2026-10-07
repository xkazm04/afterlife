'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { usePopover } from '@/components/overlays/popover/usePopover';
import { useToast } from '@/components/overlays/toast/useToast';
import { Window } from '@/components/shell/Window';
import { useRowNavigation } from '@/components/table/useRowNavigation';
import { FleetInspector } from './components/inspector/FleetInspector';
import { FleetLegend } from './components/legend/FleetLegend';
import { FleetSidebar } from './components/sidebar/FleetSidebar';
import { FleetStatus } from './components/FleetStatus';
import { FleetTable } from './components/table/FleetTable';
import { FleetToolbar } from './components/toolbar/FleetToolbar';
import { useEvent } from './hooks/useEvent';
import { useFleetKeys } from './hooks/useFleetKeys';
import { useFleetList } from './hooks/useFleetList';
import { useFleetMenus } from './hooks/useFleetMenus';
import { useFleetProjects } from './hooks/useFleetProjects';
import { useNarrow } from './hooks/useNarrow';
import { useRowHandlers } from './hooks/useRowHandlers';
import { useToolbarCompact } from './hooks/useToolbarCompact';
import { menuFilterCount, sourceLabel } from './model/list/filtering';
import { sortLabel } from './model/list/sorting';
import type { FleetData, FleetMeta, FleetSource, Source } from './model/types';

/**
 * Fleet: every project as one row, by tier counts, by action class or by stage. Select a row for its inspector,
 * right-click for actions, press a tier header to rank by it. `source` says which data source drew it and carries the
 * deep project's recent events. Nothing here writes.
 */
export function FleetScreen({ data, source }: { data: FleetData; source: FleetSource }) {
  const { status } = useToast();
  const tableRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const proj = useFleetProjects(data.projects);
  const list = useFleetList(proj.projects, data.groups);
  const pop = usePopover(380);
  const narrow = useNarrow(tableRef);
  const compact = useToolbarCompact(searchRef);
  const [sel, setSel] = useState<string | null>(data.deep.id);
  const [insp, setInsp] = useState(true);
  const meta = useMemo<FleetMeta>(() => ({ classes: data.classes, stages: data.stages, tiers: data.tiers }), [data]);

  useEffect(() => tableRef.current?.focus({ preventScroll: true }), []);

  const open = useEvent((id: string) => {
    setSel(id);
    setInsp(true);
  });
  const menus = useFleetMenus({
    data,
    list,
    byId: proj.byId,
    tableRef,
    onOpen: open,
    onRepoll: (id) => status(proj.poll(id)),
    onFlash: status,
  });

  const handlers = useRowHandlers({ data, list, menus, pop, onSelect: setSel, onActivate: open });

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
    enabled: !menus.isOpen,
    searchRef,
    tableRef,
    query: list.filters.q,
    onQuery: list.setQuery,
    inspectorOpen: insp,
    onInspectorOpen: setInsp,
    popoverOpen: pop.isOpen,
    closePopover: pop.close,
    onSelectFirst: () => {
      if (!list.nav.some((i) => i.id === sel)) setSel(list.nav.find((i) => i.kind === 'row')?.id ?? null);
    },
  });

  const pickSource = (s: Source) => {
    list.setSource(s);
    if (tableRef.current) tableRef.current.scrollTop = 0;
  };

  return (
    <Window
      title="Belay"
      subtitle={`${data.portfolio} · ${sourceLabel(list.filters.source)}`}
      toolbar={
        <FleetToolbar
          view={list.view}
          onView={list.setView}
          projects={proj.projects}
          waiting={proj.waiting}
          compact={compact}
          source={list.filters.source}
          onSource={pickSource}
          sortLabel={sortLabel(list.sort.key, data.stages)}
          onSortMenu={(el) => {
            pop.close();
            menus.openSort(el);
          }}
          filterCount={menuFilterCount(list.filters)}
          onFilterMenu={(el) => {
            pop.close();
            menus.openFilter(el);
          }}
          query={list.filters.q}
          onQuery={list.setQuery}
          searchRef={searchRef}
        />
      }
      sidebar={<FleetSidebar projects={proj.projects} groups={data.groups} source={list.filters.source} onSource={pickSource} />}
      inspector={
        <FleetInspector
          selected={sel}
          projects={proj.projects}
          byId={proj.byId}
          data={data}
          source={source}
          done={proj.done}
          onResolve={(needId, does) => {
            proj.resolve(data.deep.id, needId);
            status(does);
          }}
          onFlash={status}
        />
      }
      inspectorOpen={insp}
      onInspectorOpenChange={setInsp}
      status={<FleetStatus shown={list.visible.length} total={proj.projects.length} filters={list.filterTotal} startSec={data.lastPollSec} />}
      help={<FleetLegend tiers={data.tiers} />}
      helpTitle="Legend"
    >
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
      />
      {menus.node}
      {pop.popover}
    </Window>
  );
}
