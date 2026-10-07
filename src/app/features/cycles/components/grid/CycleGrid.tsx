'use client';

import { useEffect, useRef, type CSSProperties } from 'react';
import { px } from '@/components/table/model/columns';
import type { GridCell, GridView } from '../../model/grid';
import { rungLabel } from '../../model/replay';
import { Trajectory } from './Trajectory';
import styles from './grid.module.css';

const MOVE_WORD: Record<GridCell['move'], string> = { up: 'lifted', down: 'regressed', same: 'held', found: 'found by a probe' };

function cellTitle(stage: string, col: string, c: GridCell): string {
  if (c.target != null) return `${stage}, ${col}: aims ${rungLabel(c.rung)} → R${c.target}`;
  const tried = c.tried ? ' · a change was tried and not earned' : '';
  return `${stage}, after ${col}: ${rungLabel(c.rung)} ${MOVE_WORD[c.move]}${tried}`;
}

/**
 * The stage x cycle grid: every stage's rung after every cycle, from day 0 to the planned one. Lifts glow, a
 * regression is drawn in the second voice, a missed try leaves a ring, and open cycles show their targets as ghosts.
 * A column is a cycle: click it (or walk with the arrow keys) to select it. The column heads are one tab stop (a
 * roving tabindex): focus follows the selection, so the ring is never on a column that is not selected.
 */
export function CycleGrid({ view, selected, onSelect }: { view: GridView; selected: string; onSelect: (id: string) => void }) {
  const n = view.columns.length;
  const style = { '--n': n, '--lw': px(92) } as CSSProperties;
  const pick = (key: string) => (key === 'day0' ? undefined : () => onSelect(key));
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const root = ref.current;
    if (!root || !root.contains(document.activeElement)) return;
    root.querySelector<HTMLButtonElement>('button[aria-pressed="true"]')?.focus();
  }, [selected]);
  return (
    <div ref={ref} className={styles.grid} style={style} role="table" aria-label="Rung per stage after every cycle">
      <div className={styles.row} role="row">
        <span className={styles.corner} role="columnheader">
          Stage
        </span>
        {view.columns.map((c) => (
          <span key={c.key} role="columnheader" className={styles.chc}>
            <button
              type="button"
              className={styles.ch}
              data-state={c.state}
              data-sel={c.key === selected || undefined}
              disabled={c.key === 'day0'}
              tabIndex={c.key === selected ? 0 : -1}
              aria-pressed={c.key === 'day0' ? undefined : c.key === selected}
              onClick={pick(c.key)}
            >
              <b>{c.label}</b>
              <span>{c.sub}</span>
            </button>
          </span>
        ))}
      </div>
      <Trajectory columns={view.columns} selected={selected} />
      {view.rows.map((r) => (
        <div key={r.stage} className={styles.row} role="row">
          <span className={styles.stage} role="rowheader">
            {r.stage}
          </span>
          {r.cells.map((c, i) => {
            const col = view.columns[i];
            if (!col) return null;
            const ghost = c.target != null;
            return (
              <span
                key={col.key}
                role="cell"
                className={styles.cell}
                data-r={c.rung ?? 'q'}
                data-move={c.move}
                data-state={col.state}
                data-sel={col.key === selected || undefined}
                title={cellTitle(r.stage, col.label, c)}
                onClick={pick(col.key)}
              >
                <span className={styles.sq}>{c.rung ?? '?'}</span>
                {c.move === 'up' ? <i className={styles.up} aria-hidden="true" /> : null}
                {c.move === 'down' ? <i className={styles.down} aria-hidden="true" /> : null}
                {c.tried ? <i className={styles.tried} aria-hidden="true" /> : null}
                {ghost ? <span className={styles.ghost}>→{c.target}</span> : null}
              </span>
            );
          })}
        </div>
      ))}
      <div className={`${styles.row} ${styles.sum}`} role="row">
        <span className={styles.stage} role="rowheader">
          Rungs
        </span>
        {view.columns.map((c) => (
          <span key={c.key} role="cell" className={styles.tot} data-sel={c.key === selected || undefined} data-state={c.state}>
            {c.projected != null ? <i title="if every change earns its rung">≤{c.projected}</i> : <b>{c.total}</b>}
            {c.net != null ? <em data-neg={c.net < 0 || undefined}>{c.net > 0 ? `+${c.net}` : c.net}</em> : null}
          </span>
        ))}
      </div>
    </div>
  );
}
