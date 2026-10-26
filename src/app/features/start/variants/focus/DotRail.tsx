import type { CSSProperties } from 'react';
import { StepPulse } from '../../components/StepPulse';
import type { StepKey } from '../../model/types';
import type { StepView } from '../../model/view';
import styles from './focus.module.css';

/**
 * One dot per step, left to right: the current one glows, each connector fills once the step before it is done, and a
 * done step (or the current one) can be clicked to revisit. A step not reached yet is shown, never jumped to.
 */
export function DotRail({ steps, current, selected, onSelect }: { steps: readonly StepView[]; current: StepKey; selected: StepKey; onSelect: (k: StepKey) => void }) {
  return (
    <ol className={styles.rail} aria-label="Setup steps">
      {steps.map((s, i) => {
        const open = s.state === 'done' || s.key === current;
        const before = steps[i - 1];
        return (
          <li key={s.key} className={styles.stop} style={{ '--i': i } as CSSProperties}>
            {i > 0 ? <span className={styles.link} data-lit={before?.state === 'done' || undefined} aria-hidden="true" /> : null}
            <button
              type="button"
              className={styles.dot}
              data-current={s.key === current || undefined}
              aria-current={s.key === selected ? 'step' : undefined}
              aria-disabled={!open || undefined}
              aria-label={`${i + 1}. ${s.title}: ${s.state === 'you' ? 'waits for you' : s.state}`}
              onClick={() => open && onSelect(s.key)}
            >
              <StepPulse state={s.state} size="sm" />
              <span className={styles.dotLabel}>{s.title}</span>
            </button>
          </li>
        );
      })}
    </ol>
  );
}
