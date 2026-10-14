import type { ProofCounts } from '@/lib/demo/types';
import styles from './ProofBar.module.css';

/**
 * Pass / fail / inconclusive as one bar. null counts (unknown) draw a dashed empty box, never an empty bar.
 * `block` is the full-width variant for the inspector.
 */
export function ProofBar({ proofs, block }: { proofs: ProofCounts | null; block?: boolean }) {
  const size = block ? styles.block : styles.mini;
  if (!proofs) return <span className={`${styles.bar} ${size} ${styles.unk}`} role="img" aria-label="Proofs unknown" title="Proofs unknown" />;
  const { pass, fail, inconclusive } = proofs;
  const text = pass + fail + inconclusive === 0 ? 'No proofs yet' : `${pass} pass · ${fail} fail · ${inconclusive} inconclusive`;
  return (
    <span className={`${styles.bar} ${size}`} role="img" aria-label={text} title={text}>
      {pass ? <i className={styles.ok} style={{ flex: pass }} /> : null}
      {fail ? <i className={styles.fl} style={{ flex: fail }} /> : null}
      {inconclusive ? <i className={styles.inc} style={{ flex: inconclusive }} /> : null}
    </span>
  );
}
