import type { CSSProperties } from 'react';
import { Chip } from '@/components/status/chip/Chip';
import { px, range } from '@/components/table/model/columns';
import { rungLabel } from '../../model/replay';
import type { Cycle } from '../../model/types';
import { VERDICT_TONE, VERDICT_WORD } from '../../model/words';
import styles from './changes.module.css';

const COLUMNS = [px(52), px(84), px(80), range(160, 1000), px(46), px(92)].join(' ');
const HEADERS = ['Change', 'Stage', 'Move', 'What and why', 'Diff', 'Verdict'] as const;
const KIND_WORD = { probe: 'probe', drift: 'drift' } as const;

/**
 * The changes of one cycle: what each tried to lift and what the closing rescan made of it, in the engine's words.
 * A drift row is not a change anyone made: it is what the rescan found had slipped.
 */
export function ChangesTable({ cycle }: { cycle: Cycle }) {
  return (
    <section className={styles.t} style={{ '--cols': COLUMNS } as CSSProperties} role="table" aria-label={`${cycle.id} changes`}>
      <div className={`${styles.row} ${styles.head}`} role="row">
        {HEADERS.map((h) => (
          <div key={h} role="columnheader" className={h === 'Diff' ? `${styles.cell} ${styles.rt}` : styles.cell}>
            {h}
          </div>
        ))}
      </div>
      {cycle.changes.length === 0 ? (
        <div className={styles.empty} role="row">
          <span role="cell">Nothing picked yet: pick gaps in Maturity and they run in this cycle.</span>
        </div>
      ) : null}
      {cycle.changes.map((c, i) => (
        <div key={`${c.stage}-${c.mr ?? c.gap ?? c.kind}`} className={i % 2 ? `${styles.row} ${styles.alt}` : styles.row} data-verdict={c.verdict} role="row">
          <div role="cell" className={`${styles.cell} ${styles.id}`}>
            {c.mr ?? c.gap ?? (c.kind === 'mr' ? '—' : KIND_WORD[c.kind])}
          </div>
          <div role="cell" className={`${styles.cell} ${styles.stage}`}>
            {c.stage}
          </div>
          <div role="cell" className={`${styles.cell} ${styles.mv}`}>
            {rungLabel(c.from)} → R{c.to}
          </div>
          <div role="cell" className={`${styles.cell} ${styles.what}`}>
            <span className={styles.ttl}>{c.title}</span>
            <span className={styles.why}>{c.why}</span>
          </div>
          <div role="cell" className={`${styles.cell} ${styles.rt} ${styles.ln}`}>
            {c.lines ? `+${c.lines}` : '—'}
          </div>
          <div role="cell" className={styles.cell}>
            <Chip compact tone={VERDICT_TONE[c.verdict]}>
              {VERDICT_WORD[c.verdict]}
            </Chip>
          </div>
        </div>
      ))}
    </section>
  );
}
