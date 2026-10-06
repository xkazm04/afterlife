import type { TierKey } from '@/lib/demo/types';
import { TierMark } from '@/components/status/TierMark';
import styles from './marks.module.css';

const Arrow = () => <span className={styles.arrow}>→</span>;

/** Supervised → Hands-off, as two tier marks. */
export function TierMove({ from, to }: { from: TierKey; to: TierKey }) {
  return (
    <span className={styles.move}>
      <TierMark tier={from} />
      <Arrow />
      <TierMark tier={to} />
    </span>
  );
}

/** R3 → R4: a maturity rung moving up. */
export function RungMove({ from, to }: { from: number; to: number }) {
  return (
    <span className={styles.move}>
      <span className={styles.rung}>R{from}</span>
      <Arrow />
      <span className={styles.rung}>R{to}</span>
    </span>
  );
}
