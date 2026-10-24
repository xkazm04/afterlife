import { clampRung } from './model/cells';
import styles from './StageTicks.module.css';

/**
 * Nine ticks, one per stage; the height is the rung (0..4). A dashed box is an unknown rung, never a zero.
 * `labels` (the nine stage names) make the tooltip: "plan 1 · create 2 · ...". A tick is drawn for every stage named or
 * rung given: a stage the rung list does not reach is unknown, and a rung past the labels is named "stage N".
 */
export function StageTicks({ rungs, labels }: { rungs: readonly (number | null)[]; labels?: readonly string[] }) {
  const all = Array.from({ length: Math.max(rungs.length, labels?.length ?? 0) }, (_, i) => rungs[i] ?? null);
  const title = all.map((r, i) => `${labels?.[i] ?? `stage ${i + 1}`} ${r == null ? '?' : r}`).join(' · ');
  return (
    <span className={styles.ticks} role="img" aria-label={title} title={title}>
      {all.map((r, i) => (
        <i key={i} className={r == null ? styles.u : styles[`r${clampRung(r)}`]} />
      ))}
    </span>
  );
}
