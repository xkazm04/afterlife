import styles from './ScanMeta.module.css';

/** Engine version and scan age. Credit never crosses engine versions, so the engine is always on screen. */
export function ScanMeta({ engine, scannedAt, ageMin, cadence }: { engine: string; scannedAt: string; ageMin: number; cadence: string }) {
  return (
    <div className={styles.meta} role="group" aria-label="Scan">
      <span title="Rescans use the same engine; credit never crosses engine versions">
        <i className={styles.dot} />
        engine <b>{engine}</b>
      </span>
      <span className={styles.div} aria-hidden="true" />
      <span title={cadence}>
        scanned <b>{scannedAt}</b>&nbsp;·&nbsp;{ageMin ? `${ageMin} min` : <span className={styles.fresh}>just now</span>}
      </span>
    </div>
  );
}
