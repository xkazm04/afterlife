import { STEP_MEANS, STEP_WORD, STEPS, type Step } from '../../model/funnel';
import styles from './funnel.module.css';

/**
 * The estate as a funnel: how many projects have reached each step, out of everything discovered. Each step is a
 * filter for the batch table below; the share under it is of the whole estate. Unknown is never counted as done.
 */
export function Funnel({ counts, filter, onFilter }: { counts: Record<Step, number>; filter: Step | null; onFilter: (s: Step | null) => void }) {
  const all = counts.discovered || 1;
  return (
    <ol className={styles.funnel} aria-label="Onboarding funnel">
      {STEPS.map((s, i) => {
        const n = counts[s];
        const pct = Math.round((n / all) * 100);
        return (
          <li key={s} className={styles.item}>
            {i > 0 ? (
              <span className={styles.arrow} aria-hidden="true">
                ›
              </span>
            ) : null}
            <button
              type="button"
              className={styles.step}
              aria-pressed={filter === s}
              title={`${STEP_WORD[s]}: ${STEP_MEANS[s]}`}
              onClick={() => onFilter(filter === s ? null : s)}
            >
              <span className={styles.word}>{STEP_WORD[s]}</span>
              <b className={styles.n}>{n}</b>
              <span className={styles.bar} aria-hidden="true">
                <i style={{ width: `${pct}%` }} />
              </span>
              <span className={styles.pct}>{pct} % of the estate</span>
            </button>
          </li>
        );
      })}
    </ol>
  );
}
