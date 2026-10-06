import { ProofBar } from '@/components/viz/ProofBar';
import type { ProofCounts } from '@/lib/demo/types';
import styles from './cells.module.css';

/**
 * The proofs of the last 7 days: the pass count, a mini bar and the fail count. Unknown (null) is a "?" and a dashed
 * box, never a zero; a known zero is "0" and an empty bar.
 */
export function ProofsCell({ proofs }: { proofs: ProofCounts | null }) {
  if (!proofs) {
    return (
      <>
        <span className={styles.pn}>?</span>
        <ProofBar proofs={null} />
      </>
    );
  }
  return (
    <>
      <span className={styles.pn}>{proofs.pass}</span>
      <ProofBar proofs={proofs} />
      {proofs.fail ? <span className={styles.pf}>{proofs.fail}</span> : null}
    </>
  );
}
