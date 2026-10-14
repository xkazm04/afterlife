import { CHECKS } from '../../data/constants';
import type { CheckId } from '../../model/types';
import styles from './ProofChecks.module.css';

/**
 * The five proof checks of !41 as a list on the stage, ticking in as the replay reaches each one (`done` is the
 * snapshot's `checks`, the same field the inspector's ChecksSection reads). A static labelled list: no live region,
 * the Answers card already announces the story. Not yet run is a dashed dot and a dash, never a fail.
 */
export function ProofChecks({ done }: { done: readonly CheckId[] }) {
  const all = done.length === CHECKS.length;
  return (
    <section className={`${styles.box} ${all ? styles.all : ''}`} aria-label="Proof checks on !41, illustrative replay">
      <h3 className={styles.hd}>
        <span>Proof checks · !41</span>
        <span className={styles.aux}>{all ? 'PASS' : `${done.length} / ${CHECKS.length}`}</span>
      </h3>
      <ul className={styles.list}>
        {CHECKS.map((c) => {
          const ok = done.includes(c);
          return (
            <li key={c} className={ok ? styles.pass : undefined}>
              <i className={styles.g} aria-hidden="true" />
              <span className={styles.nm}>{c}</span>
              <span className={styles.rs}>{ok ? 'PASS' : '—'}</span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
