import { clampRung } from './model/cells';
import styles from './StageTicks.module.css';

/**
 * Nine ticks, one per stage; the height is the rung (0..4). A dashed box is an unknown rung, never a zero.
 * `labels` (the nine stage names) make the tooltip: "plan 1 · create 2 · ...".
 */
export function StageTicks({ rungs, labels }: { rungs: readonly (number | null)[]; labels?: readonly string[] }) {
  const title = labels?.map((s, i) => `${s} ${rungs[i] == null ? '?' : rungs[i]}`).join(' · ');
  return (
    <span className={styles.ticks} title={title}>
      {rungs.map((r, i) => (
        <i key={i} className={r == null ? styles.u : styles[`r${clampRung(r)}`]} />
      ))}
    </span>
  );
}
