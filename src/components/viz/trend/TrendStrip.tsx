import type { CSSProperties } from 'react';
import styles from './trend.module.css';

/**
 * A 28-day mini series, oldest left: one bar per day, its height against the series' own peak. A day with no row (the
 * history is younger than the strip) and a day whose value is unknown are dashed empty cells, never a zero bar. `unit` names
 * a cell when it is not a day ("run": Vitals draws one cell per CI run).
 */
export function TrendStrip({ values, label, days = 28, unit = ['day', 'days'] }: { values: readonly (number | null)[]; label: string; days?: number; unit?: readonly [one: string, many: string] }) {
  const shown = values.slice(-days);
  const cells: (number | null | undefined)[] = [...Array<undefined>(Math.max(0, days - shown.length)).fill(undefined), ...shown];
  const known = shown.filter((v): v is number => v !== null);
  const peak = Math.max(1, ...known);
  const last = shown.at(-1);
  const name = known.length
    ? `${label} over ${shown.length} ${shown.length === 1 ? unit[0] : unit[1]}: ${Math.min(...known)} to ${Math.max(...known)}, now ${last ?? 'unknown'}`
    : `${label}: no ${unit[1]} recorded`;
  return (
    <span className={styles.strip} role="img" aria-label={name} title={name}>
      {cells.map((v, i) =>
        v == null ? (
          <i key={i} className={styles.gap} />
        ) : (
          <i key={i} className={styles.bar} style={{ '--h': `${Math.round((v / peak) * 100)}%` } as CSSProperties} />
        ),
      )}
    </span>
  );
}
