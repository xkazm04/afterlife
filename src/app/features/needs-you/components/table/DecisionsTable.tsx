import type { MouseEvent, KeyboardEventHandler, Ref } from 'react';
import { Button } from '@/components/controls/Button';
import { NeedsYouBadge } from '@/components/status/NeedsYouBadge';
import { Cell } from '@/components/table/Cell';
import { GroupRow } from '@/components/table/GroupRow';
import { HeaderCell } from '@/components/table/HeaderCell';
import { minWidth, range } from '@/components/table/model/columns';
import { groupNavId, rowDomId } from '@/components/table/model/rowNavigation';
import { OutlineTable } from '@/components/table/OutlineTable';
import { RowGroup } from '@/components/table/RowGroup';
import type { NeedsYouDemo } from '../../data/types';
import { pickedGaps } from '../../model/act';
import { clockText } from '../../model/clock/clock';
import { isGapId, isWaiting } from '../../model/rows/rowState';
import type { VisibleGroup } from '../../model/rows/grouping';
import type { Action, NeedsState } from '../../model/types';
import { DecisionRow } from './DecisionRow';
import { HistoryRow } from './HistoryRow';
import styles from './table.module.css';

// The prototype's widths at the Smaller setting; each fixed track gives up a few px before the pane scrolls.
// The title column keeps room for its indent, pick box and the seeded chip.
const COLUMNS = [range(190, 4000), range(92, 100), range(100, 108), range(34, 40), range(70, 74), range(92, 98), range(120, 132)].join(' ');
const CLOCK_GROUPS = ['clock', 'd-clock'];

export interface DecisionsTableProps {
  s: NeedsState;
  demo: NeedsYouDemo;
  groups: readonly VisibleGroup[];
  leftSec: number;
  menuing: boolean;
  tableRef: Ref<HTMLDivElement>;
  onKeyDown: KeyboardEventHandler<HTMLDivElement>;
  dispatch: (a: Action) => void;
  onActivate: (id: string) => void;
  onRowMenu: (id: string, e: MouseEvent) => void;
  onGroupMenu: (id: string, e: MouseEvent) => void;
}

/** The decisions, grouped By kind / By project / By deadline, with "Decided this week" last. */
export function DecisionsTable(p: DecisionsTableProps) {
  const { s, groups, dispatch } = p;
  const picked = pickedGaps(s, p.demo).length;
  return (
    <OutlineTable
      label="Decisions"
      columns={COLUMNS}
      minWidth={minWidth(700)}
      menuing={p.menuing}
      activeId={s.sel ? rowDomId(s.sel) : undefined}
      tableRef={p.tableRef}
      onKeyDown={p.onKeyDown}
      header={
        <>
          <HeaderCell>Decision</HeaderCell>
          <HeaderCell tip="What moves: tier, rung or packet grade">Move</HeaderCell>
          <HeaderCell tip="What the click writes">Writes</HeaderCell>
          <HeaderCell tip="Track">Trk</HeaderCell>
          <HeaderCell align="end" tip="Time left on a clock, or when it was opened">
            When
          </HeaderCell>
          <HeaderCell>State</HeaderCell>
          <HeaderCell tip="Action" />
        </>
      }
    >
      {groups.length === 0 ? (
        <div className={styles.empty} role="row">
          No decisions
        </div>
      ) : null}
      {groups.map((g) => {
        const waiting = g.hist ? 0 : g.visible.filter((id) => isWaiting(s, id)).length;
        const stageAll = picked > 0 && (g.id === 'improve' || (s.group !== 'kind' && g.visible.some(isGapId)));
        return (
          <RowGroup key={g.id}>
            <GroupRow
              id={g.id}
              label={g.name}
              count={g.visible.length}
              expanded={g.expanded}
              selected={s.sel === groupNavId(g.id)}
              onSelect={(id) => dispatch({ type: 'select', id })}
              onToggle={(id) => dispatch({ type: 'toggleGroup', id })}
              onContextMenu={p.onGroupMenu}
            >
              <Cell />
              <Cell />
              <Cell />
              <Cell align="end">{CLOCK_GROUPS.includes(g.id) ? <span className={`${styles.mono} ${styles.due}`}>{clockText(p.leftSec)}</span> : null}</Cell>
              <Cell>{waiting ? <NeedsYouBadge count={waiting} variant="group" title={`${waiting} waiting for you`} /> : null}</Cell>
              <Cell align="end" className={styles.act}>
                {stageAll ? (
                  <Button size="mini" variant="accent" tabIndex={-1} title="One draft MR per picked gap, into the outbox" onClick={() => dispatch({ type: 'act', action: 'stage-gaps' })}>
                    Stage {picked} picked
                  </Button>
                ) : null}
              </Cell>
            </GroupRow>
            {g.expanded
              ? g.visible.map((id, i) =>
                  g.hist ? (
                    <HistoryRow key={id} id={id} index={i} s={s} dispatch={dispatch} onActivate={p.onActivate} onContextMenu={p.onRowMenu} />
                  ) : (
                    <DecisionRow key={id} id={id} index={i} s={s} demo={p.demo} leftSec={p.leftSec} dispatch={dispatch} onActivate={p.onActivate} onContextMenu={p.onRowMenu} />
                  ),
                )
              : null}
          </RowGroup>
        );
      })}
    </OutlineTable>
  );
}
