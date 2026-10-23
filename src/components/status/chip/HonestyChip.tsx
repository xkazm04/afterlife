import type { ReactNode } from 'react';
import styles from './HonestyChip.module.css';

export type HonestyKind = 'seeded' | 'simulated' | 'unknown' | 'stale';

const DEFAULT_LABEL: Record<HonestyKind, string> = { seeded: 'seeded', simulated: 'simulated', unknown: 'unknown', stale: 'stale' };
const MEANING: Record<HonestyKind, string> = {
  seeded: 'Seeded fault: planted on purpose for the demo',
  simulated: 'Simulated: nothing real ran',
  unknown: 'Unknown: never treated as zero or absent',
  stale: 'Stale: last known value',
};

/**
 * The honesty marks as chips. seeded and simulated and unknown are dashed; stale is hatched and shows its age.
 * `age` is already formatted ("40 m"). `children` replace the default word; `meaning` replaces the default hover text.
 */
export function HonestyChip({ kind, age, children, meaning }: { kind: HonestyKind; age?: string; children?: ReactNode; meaning?: string }) {
  return (
    <span className={`${styles.chip} ${styles[kind]}`} title={meaning ?? MEANING[kind]}>
      {children ?? DEFAULT_LABEL[kind]}
      {kind === 'stale' && age ? <span className={styles.age}> · {age}</span> : null}
    </span>
  );
}
