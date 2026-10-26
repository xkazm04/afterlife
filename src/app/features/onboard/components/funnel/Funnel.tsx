import { STEP_MEANS, STEP_WORD, STEPS, type Step } from '../../model/funnel';
import { Unread } from '@/components/shell/host';
import styles from './funnel.module.css';

/**
 * The estate as a funnel: how many projects have reached each step (cumulative), out of everything discovered. A
 * step filters the batch table to the projects sitting at exactly that step. Unknown is never counted as done.
 * `unread`: the estate is not read yet; the step names stand, every count and share is a dash.
 */
export function Funnel({ counts, filter, onFilter, unread = false }: { counts: Record<Step, number>; filter: Step | null; onFilter: (s: Step | null) => void; unread?: boolean }) {
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
              aria-pressed={s === 'cycling' ? undefined : filter === s}
              disabled={s === 'cycling' || unread}
              title={`${STEP_WORD[s]}: ${STEP_MEANS[s]}. ${s === 'cycling' ? 'Nothing left to onboard here.' : `Click to show the batch rows sitting at ${STEP_WORD[s].toLowerCase()}.`}`}
              onClick={() => onFilter(filter === s ? null : s)}
            >
              <span className={styles.word}>{STEP_WORD[s]}</span>
              <b className={styles.n}>{unread ? <Unread label={`${STEP_WORD[s]}: not read yet`} /> : n}</b>
              <span className={styles.bar} aria-hidden="true">
                <i style={{ width: `${pct}%` }} />
              </span>
              <span className={styles.pct} title={`${pct} % of the estate has reached this step`}>
                {unread ? <Unread /> : pct} %
              </span>
            </button>
          </li>
        );
      })}
    </ol>
  );
}
