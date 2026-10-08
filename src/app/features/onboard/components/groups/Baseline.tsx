import type { BaselineRow } from '../../model/funnel';
import { weakest } from '../../model/funnel';
import styles from './groups.module.css';

/**
 * The estate's day-0 picture: per stage, how many baselined projects stand on each rung (R0 dim to R4 bright), the
 * unrated hatched, and the median. The weakest stage is named: it is the natural theme of the estate's first cycles.
 */
export function Baseline({ rows }: { rows: readonly BaselineRow[] }) {
  const weak = weakest(rows);
  return (
    <section className={styles.card} aria-label="Estate baseline">
      <h3 className={styles.h}>
        Baseline <span>every baselined project, stage by stage</span>
      </h3>
      <div className={styles.rows}>
        {rows.map((r) => {
          const n = r.rungs.reduce((a, b) => a + b, 0) + r.unknown;
          return (
            <div key={r.stage} className={styles.brow} data-weak={r.stage === weak?.stage || undefined} title={`${r.stage}: ${r.rungs.map((c, i) => `R${i} ${c}`).join(' · ')} · unrated ${r.unknown}`}>
              <span className={styles.name}>{r.stage}</span>
              <span className={styles.bar} aria-hidden="true">
                {r.rungs.map((c, i) => (c ? <i key={i} data-r={i} style={{ flexGrow: c }} /> : null))}
                {r.unknown ? <i data-r="q" style={{ flexGrow: r.unknown }} /> : null}
              </span>
              <span className={styles.n} aria-label={`median ${r.median == null ? 'unknown' : `R${r.median}`} over ${n} projects`}>
                {r.median == null ? 'R?' : `R${r.median}`}
              </span>
            </div>
          );
        })}
      </div>
      {weak ? (
        <p className={styles.callout}>
          Weakest: <b>{weak.stage}</b>, median R{weak.median}, {weak.rungs[0]} at R0. A theme for the first cycles across the estate.
        </p>
      ) : null}
    </section>
  );
}
