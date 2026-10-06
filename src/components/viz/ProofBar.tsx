import type { ProofCounts } from '@/lib/demo/types';
import styles from './ProofBar.module.css';

/**
 * Pass / fail / inconclusive as one bar. null counts (unknown) draw a dashed empty box, never an empty bar.
 * `block` is the full-width variant for the inspector.
 */
export function ProofBar({ proofs, block }: { proofs: ProofCounts | null; block?: boolean }) {
  const size = block ? styles.block : styles.mini;
  if (!proofs) return <span className={`${styles.bar} ${size} ${styles.unk}`} title="Proofs unknown" />;
  const { pass, fail, inconclusive } = proofs;
  return (
    <span className={`${styles.bar} ${size}`} title={`${pass} pass · ${fail} fail · ${inconclusive} inconclusive`}>
      {pass ? <i className={styles.ok} style={{ flex: pass }} /> : null}
      {fail ? <i className={styles.fl} style={{ flex: fail }} /> : null}
      {inconclusive ? <i className={styles.inc} style={{ flex: inconclusive }} /> : null}
    </span>
  );
}
