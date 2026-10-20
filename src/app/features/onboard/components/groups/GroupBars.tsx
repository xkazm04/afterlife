import { STEP_WORD, STEPS, type GroupProgress } from '../../model/funnel';
import styles from './groups.module.css';

/** Per group: one stacked bar of where its projects sit, from discovered (dim) to in cycles (bright). */
export function GroupBars({ groups, selectedGroup, onGroup }: { groups: readonly GroupProgress[]; selectedGroup: string | null; onGroup: (g: string | null) => void }) {
  return (
    <section className={styles.card} aria-label="Groups">
      <h3 className={styles.h}>
        Groups <span>where each group&apos;s projects sit</span>
      </h3>
      <div className={styles.rows}>
        {groups.map((g) => {
          const live = g.at.watching + g.at.cycling;
          return (
            <button
              key={g.group}
              type="button"
              className={styles.row}
              aria-pressed={selectedGroup === g.group}
              onClick={() => onGroup(selectedGroup === g.group ? null : g.group)}
              title={STEPS.map((s) => `${STEP_WORD[s]} ${g.at[s]}`).join(' · ')}
            >
              <span className={styles.name}>{g.group}</span>
              <span className={styles.bar} aria-hidden="true">
                {STEPS.map((s) => (g.at[s] ? <i key={s} data-step={s} style={{ flexGrow: g.at[s] }} /> : null))}
              </span>
              <span className={styles.n}>
                {live}/{g.total}
              </span>
            </button>
          );
        })}
      </div>
      <p className={styles.key}>
        {STEPS.map((s) => (
          <span key={s}>
            <i data-step={s} aria-hidden="true" />
            {STEP_WORD[s]}
          </span>
        ))}
      </p>
    </section>
  );
}
