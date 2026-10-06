'use client';

import type { KeyboardEventHandler, RefObject } from 'react';
import { OutlineTable } from '@/components/table/OutlineTable';
import { RowGroup } from '@/components/table/RowGroup';
import type { SortState } from '@/components/table/model/sort';
import { groupNavId, rowDomId } from '@/components/table/model/rowNavigation';
import type { FleetProject } from '@/lib/demo/types';
import { fleetColumns, gridFor } from '../../model/columns';
import { rankedTier } from '../../model/list/sorting';
import type { FleetMeta, FleetView, GroupBlock, SortKey } from '../../model/types';
import { FleetHeader } from './FleetHeader';
import { GroupTotalsRow } from './GroupTotalsRow';
import { ProjectRow } from './ProjectRow';
import styles from './fleetTable.module.css';
import type { RowHandlers } from './types';

export interface FleetTableProps {
  view: FleetView;
  narrow: boolean;
  sort: SortState<SortKey>;
  onSort: (key: SortKey) => void;
  meta: FleetMeta;
  blocks: readonly GroupBlock[];
  visible: readonly FleetProject[];
  grouped: boolean;
  collapsed: ReadonlySet<string>;
  selected: string | null;
  menuing: boolean;
  tableRef: RefObject<HTMLDivElement | null>;
  onKeyDown: KeyboardEventHandler<HTMLDivElement>;
  handlers: RowHandlers;
}

/** The treegrid: header, then group rows with their projects (or the flat list), for the chosen view. */
export function FleetTable(props: FleetTableProps) {
  const { view, narrow, sort, meta, blocks, visible, grouped, collapsed, selected, handlers: h } = props;
  const grid = gridFor(view, narrow);
  const ranked = rankedTier(sort);
  const row = (p: FleetProject, i: number) => (
    <ProjectRow key={p.id} p={p} view={view} ranked={ranked} narrow={narrow} meta={meta} selected={selected === p.id} alt={i % 2 === 1} grouped={grouped} h={h} />
  );
  let body;
  if (!visible.length) {
    body = (
      <div role="row">
        <div role="gridcell" className={styles.empty}>
          No projects
        </div>
      </div>
    );
  } else if (grouped) {
    body = blocks.map((b) => {
      const open = !collapsed.has(b.group);
      return (
        <RowGroup key={b.group}>
          <GroupTotalsRow group={b.group} list={b.projects} view={view} ranked={ranked} meta={meta} expanded={open} selected={selected === groupNavId(b.group)} h={h} />
          {open ? b.projects.map(row) : null}
        </RowGroup>
      );
    });
  } else {
    body = <RowGroup>{visible.map(row)}</RowGroup>;
  }
  return (
    <OutlineTable
      label="Projects"
      columns={grid.columns}
      minWidth={grid.minWidth}
      flat={!grouped}
      menuing={props.menuing}
      activeId={selected ? rowDomId(selected) : undefined}
      onKeyDown={props.onKeyDown}
      tableRef={props.tableRef}
      header={<FleetHeader columns={fleetColumns(view, meta)} sort={sort} onSort={props.onSort} narrow={narrow} />}
    >
      {body}
    </OutlineTable>
  );
}
