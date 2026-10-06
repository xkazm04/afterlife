import type { MouseEvent } from 'react';
import { Button } from '@/components/controls/Button';
import { Checkbox } from '@/components/controls/Checkbox';
import { HonestyChip } from '@/components/status/chip/HonestyChip';
import { Cell } from '@/components/table/Cell';
import { Row } from '@/components/table/Row';
import type { NeedsYouDemo } from '../../data/types';
import { clockText } from '../../model/clock/clock';
import { rowAction } from '../../model/rows/rowAction';
import { rowView } from '../../model/rows/rowData';
import { rowState } from '../../model/rows/rowState';
import type { Action, NeedsState } from '../../model/types';
import { DecisionGlyph } from '../shared/DecisionGlyph';
import { MoveCell } from './MoveCell';
import styles from './table.module.css';

const TONE: Record<string, string | undefined> = { ok: styles.ok, stg: styles.stg, dim: styles.dim, unk: styles.unk };

export interface RowHandlers {
  dispatch: (a: Action) => void;
  onActivate: (id: string) => void;
  onContextMenu: (id: string, e: MouseEvent) => void;
}

/** One decision: title (with a pick box for a gap), what moves, what the click writes, track, when, state, one action. */
export function DecisionRow({ id, index, s, demo, leftSec, dispatch, onActivate, onContextMenu }: RowHandlers & { id: string; index: number; s: NeedsState; demo: NeedsYouDemo; leftSec: number }) {
  const v = rowView(s, id, demo);
  if (!v) return null;
  const state = rowState(s, id);
  const action = rowAction(s, id);
  const picked = !!s.gaps[id] || !!s.gapStatus[id];
  return (
    <Row id={id} alt={index % 2 === 1} selected={s.sel === id} onSelect={(x) => dispatch({ type: 'select', id: x })} onActivate={onActivate} onContextMenu={onContextMenu}>
      <Cell indent className={styles.lead}>
        {v.pick ? (
          <Checkbox checked={picked} disabled={!!s.gapStatus[id]} label={`Pick ${v.title}`} onChange={() => dispatch({ type: 'act', action: `tick:${id}` })} />
        ) : (
          <span className={styles.spacer} />
        )}
        <span className={styles.nm} title={v.title}>
          {v.title}
        </span>
        {v.seeded ? <HonestyChip kind="seeded" /> : null}
      </Cell>
      <Cell>
        <MoveCell move={v.move} />
      </Cell>
      <Cell>
        <span className={styles.writes}>
          {v.writes.kind === 'text' ? v.writes.text : null}
          {v.writes.kind === 'none' ? <span className={styles.none}>none</span> : null}
          {v.writes.kind === 'issue' ? (
            <>
              issue
              <span title="Diff unknown until the probe runs">
                <HonestyChip kind="unknown">diff ?</HonestyChip>
              </span>
            </>
          ) : null}
        </span>
      </Cell>
      <Cell>
        <span className={`${styles.mono} ${styles.track}`}>{v.track}</span>
      </Cell>
      <Cell align="end">
        <span className={`${styles.mono} ${v.due ? styles.due : styles.when}`}>{v.due ? clockText(leftSec) : v.when}</span>
      </Cell>
      <Cell>
        <span className={`${styles.stx} ${TONE[state.tone] ?? ''}`}>
          <DecisionGlyph kind={state.glyph} />
          {state.label}
        </span>
      </Cell>
      <Cell align="end" className={styles.act}>
        {action ? (
          <Button size="mini" variant={action.variant} tabIndex={-1} onClick={() => dispatch({ type: 'act', action: action.action })}>
            {action.label}
          </Button>
        ) : null}
      </Cell>
    </Row>
  );
}
