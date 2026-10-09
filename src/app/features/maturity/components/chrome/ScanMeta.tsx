import styles from './ScanMeta.module.css';

/**
 * Engine version and scan time. Credit never crosses engine versions, so the engine is always on screen. `ageMin` is null
 * when the age is not known (live mode: the view carries the scan's clock time only); `scanned` false reads "not scanned".
 */
export function ScanMeta({ engine, scannedAt, ageMin, cadence, scanned }: { engine: string; scannedAt: string; ageMin: number | null; cadence: string; scanned: boolean }) {
  return (
    <div className={styles.meta} role="group" aria-label="Scan">
      <span title="Rescans use the same engine; credit never crosses engine versions">
        <i className={styles.dot} />
        engine <b>{engine}</b>
      </span>
      <span className={styles.div} aria-hidden="true" />
      {scanned ? (
        <span title={cadence}>
          scanned <b>{scannedAt}</b>
          {ageMin === null ? null : <>&nbsp;·&nbsp;{ageMin ? `${ageMin} min` : <span className={styles.fresh}>just now</span>}</>}
        </span>
      ) : (
        <span title={cadence}>not scanned</span>
      )}
    </div>
  );
}
