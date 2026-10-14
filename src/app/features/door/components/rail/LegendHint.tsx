import type { ReactNode } from 'react';
import styles from './legend.module.css';

/** The tier legend, folded into a small "?" that opens on hover or focus (CSS only). */
export function LegendHint({ children }: { children: ReactNode }) {
  return (
    <div className={styles.hint}>
      <button type="button" className={styles.q} aria-label="Tier legend" aria-describedby="door-tier-legend">
        ?
      </button>
      <div id="door-tier-legend" role="tooltip" className={styles.pop}>
        {children}
      </div>
    </div>
  );
}
