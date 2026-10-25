'use client';

import { useMemo, useRef, type ReactNode } from 'react';
import { Cell } from '@/components/table/Cell';
import { HeaderCell } from '@/components/table/HeaderCell';
import { minWidth } from '@/components/table/model/columns';
import { rowDomId, type NavItem } from '@/components/table/model/rowNavigation';
import { OutlineTable } from '@/components/table/OutlineTable';
import { Row } from '@/components/table/Row';
import { useRowNavigation } from '@/components/table/useRowNavigation';

export interface BandColumn {
  head: string;
  tip?: string;
  align?: 'end';
}

export interface BandRow {
  id: string;
  cells: readonly ReactNode[];
  muted?: boolean;
  title?: string;
}

/**
 * One band's flat table, in the page's flow (the PaneScroll scrolls it): rows select on click or the arrow keys, Enter
 * or a double-click hands the row to `onActivate`. The selection is the screen's, shared by the three bands.
 */
export function BandTable({ label, columns, min, head, rows, selected, onSelect, onActivate }: {
  label: string;
  columns: string;
  min: number;
  head: readonly BandColumn[];
  rows: readonly BandRow[];
  selected: string | null;
  onSelect: (id: string) => void;
  onActivate?: (id: string) => void;
}) {
  const tableRef = useRef<HTMLDivElement>(null);
  const items = useMemo<NavItem[]>(() => rows.map((r) => ({ id: r.id, kind: 'row' })), [rows]);
  const mine = rows.some((r) => r.id === selected) ? selected : null;
  const onKeyDown = useRowNavigation({ items, selected: mine, onSelect, tableRef, onActivate, onToggleGroup: () => undefined });
  return (
    <OutlineTable
      label={label}
      columns={columns}
      minWidth={minWidth(min)}
      tableRef={tableRef}
      onKeyDown={onKeyDown}
      activeId={mine ? rowDomId(mine) : undefined}
      flat
      flow
      header={head.map((h) => (
        <HeaderCell key={h.head} align={h.align} tip={h.tip}>
          {h.head}
        </HeaderCell>
      ))}
    >
      {rows.map((r, i) => (
        <Row key={r.id} id={r.id} level={1} alt={i % 2 === 1} muted={r.muted} selected={r.id === selected} onSelect={onSelect} onActivate={onActivate}>
          {r.cells.map((c, j) => (
            <Cell key={j} indent={j === 0} align={head[j]?.align} title={j === 0 ? r.title : undefined}>
              {c}
            </Cell>
          ))}
        </Row>
      ))}
    </OutlineTable>
  );
}
