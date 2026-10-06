'use client';

import type { KeyboardEventHandler, MouseEvent, Ref } from 'react';
import { Kbd } from '@/components/controls/Kbd';
import { Cell } from '@/components/table/Cell';
import { GroupRow } from '@/components/table/GroupRow';
import { HeaderCell } from '@/components/table/HeaderCell';
import { OutlineTable } from '@/components/table/OutlineTable';
import { RowGroup } from '@/components/table/RowGroup';
import { minWidth, px } from '@/components/table/model/columns';
import { rowDomId } from '@/components/table/model/rowNavigation';
import type { GroupView } from '../../model/view/rows';
import type { ClassRow, LadderSort, SortKey, TrackMap } from '../../model/types';
import type { Promotion } from '../../model/rules/promotion';
import { ClassLine, type LineHandlers } from './ClassLine';
import styles from './ladderTable.module.css';

// Smaller-setting widths of the ten columns; the first is wider than the prototype's 136 so a group name fits. The two
// flexible ones take 12 and 16 fr so the table's own filler track (1 fr) stays a sliver.
const COLUMNS = [
  `minmax(${px(176)}, 12fr)`, px(104), px(70), px(44), px(50), px(56), px(30), px(108), `minmax(${px(100)}, 16fr)`, px(164),
].join(' ');
const MIN_WIDTH = 902;
const EMPTY_AFTER_NAME = 9;

const HEADERS: readonly { key: SortKey | null; label: string; align?: 'end' | 'center'; tip?: string }[] = [
  { key: 'name', label: 'Class' },
  { key: 'tier', label: 'Tier' },
  { key: 'ceiling', label: 'Ceiling', tip: 'Rung inside the ceiling · Q A S H' },
  { key: 'lease', label: 'Lease', align: 'end', tip: 'Lease days left' },
  { key: 'acc', label: 'Acc', align: 'end', tip: 'Accepted outputs / needed' },
  { key: 'noedit', label: 'No-edit', align: 'end', tip: 'Merged without edits' },
  { key: 'rv', label: 'Rv', align: 'center', tip: 'Reverts' },
  { key: 'clean', label: 'Clean · 14 d', tip: 'Clean days of the last 14' },
  { key: 'move', label: 'Last move' },
];

export interface ClassTableProps extends Omit<LineHandlers, 'onMenu'> {
  groups: readonly GroupView[];
  grouped: boolean;
  tracks: TrackMap;
  sort: LadderSort;
  onSort: (key: SortKey) => void;
  sel: string | null;
  just: string | null;
  promotionOf: (c: ClassRow) => Promotion;
  empty: boolean;
  menuing: boolean;
  onToggleGroup: (id: string) => void;
  onRowMenu: (id: string, e: MouseEvent) => void;
  onGroupMenu: (id: string, e: MouseEvent) => void;
  onKeyDown: KeyboardEventHandler<HTMLDivElement>;
  tableRef: Ref<HTMLDivElement>;
}

/** The class table: groups T1-T8 with sortable headers, one row per action class. */
export function ClassTable(p: ClassTableProps) {
  const header = (
    <>
      {HEADERS.map((h) => (
        <HeaderCell key={h.label} sortKey={h.key ?? undefined} sort={p.sort} onSort={p.onSort} align={h.align} tip={h.tip}>
          {h.label}
        </HeaderCell>
      ))}
      <HeaderCell />
    </>
  );
  return (
    <OutlineTable
      label="Action classes"
      columns={COLUMNS}
      minWidth={minWidth(MIN_WIDTH)}
      header={header}
      flat={!p.grouped}
      menuing={p.menuing}
      activeId={p.sel ? rowDomId(p.sel) : undefined}
      onKeyDown={p.onKeyDown}
      tableRef={p.tableRef}
    >
      {p.empty ? (
        <div className={styles.empty}>
          No class matches · <Kbd>0</Kbd> clears the tier filter
        </div>
      ) : (
        p.groups.map((g) => (
          <RowGroup key={g.id || 'flat'}>
            {p.grouped ? (
              <GroupRow
                id={g.id}
                label={
                  <>
                    <span className={styles.trackId}>{g.id}</span> {p.tracks[g.id]?.name ?? ''}
                  </>
                }
                count={g.items.length}
                expanded={g.open}
                selected={p.sel === `g:${g.id}`}
                onSelect={p.onSelect}
                onToggle={p.onToggleGroup}
                onContextMenu={p.onGroupMenu}
              >
                {Array.from({ length: EMPTY_AFTER_NAME }, (_, i) => (
                  <Cell key={i} />
                ))}
              </GroupRow>
            ) : null}
            {g.open
              ? g.items.map((c, i) => (
                  <ClassLine
                    key={c.id}
                    cls={c}
                    promotion={p.promotionOf(c)}
                    selected={p.sel === c.id}
                    alt={i % 2 === 1}
                    grouped={p.grouped}
                    just={p.just === c.id}
                    onSelect={p.onSelect}
                    onActivate={p.onActivate}
                    onMenu={p.onRowMenu}
                    onRevoke={p.onRevoke}
                    onTargets={p.onTargets}
                    onPromote={p.onPromote}
                  />
                ))
              : null}
          </RowGroup>
        ))
      )}
    </OutlineTable>
  );
}
