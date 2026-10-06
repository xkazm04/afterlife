import { Cell } from '@/components/table/Cell';
import { Row } from '@/components/table/Row';
import { KIND_WORDS } from '../../data/week';
import { histRow } from '../../model/rows/history';
import type { NeedsState } from '../../model/types';
import { DecisionGlyph } from '../shared/DecisionGlyph';
import type { RowHandlers } from './DecisionRow';
import styles from './table.module.css';

/** A row of "Decided this week". Dim, except the ones decided in this session. */
export function HistoryRow({ id, index, s, dispatch, onActivate, onContextMenu }: RowHandlers & { id: string; index: number; s: NeedsState }) {
  const r = histRow(s, id);
  if (!r) return null;
  const cls = `${styles.hist} ${r.fresh ? styles.fresh : ''}`;
  return (
    <Row id={id} alt={index % 2 === 1} selected={s.sel === id} onSelect={(x) => dispatch({ type: 'select', id: x })} onActivate={onActivate} onContextMenu={onContextMenu}>
      <Cell indent className={`${styles.lead} ${cls}`}>
        <span className={styles.spacer} />
        <span className={styles.nm} title={r.what}>
          {r.what}
        </span>
      </Cell>
      <Cell className={cls}>
        <span className={styles.writes}>{r.result}</span>
      </Cell>
      <Cell className={cls}>
        <span className={`${styles.nm} ${styles.ref}`} title={r.ref}>
          {r.ref}
        </span>
      </Cell>
      <Cell />
      <Cell align="end" className={cls}>
        <span className={styles.when}>{r.when}</span>
      </Cell>
      <Cell>
        <span className={`${styles.stx} ${r.fresh ? styles.stg : styles.dim}`}>
          <DecisionGlyph kind={r.fresh ? 'stg' : 'ok'} />
          {KIND_WORDS[r.kind] ?? r.kind}
        </span>
      </Cell>
      <Cell />
    </Row>
  );
}
