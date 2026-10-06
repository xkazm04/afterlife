// kit-candidate: Stepper - segmented step progress (Pick → Preview → Send → After merge). Kit candidate from the
// prototype notes (`.stepper`); promote to src/components/controls when a second screen needs it.
import { Icon } from '@/components/icons/Icon';
import type { Step } from '../../model/state';
import type { StepView } from '../../model/steps';
import { cx } from '../cx';
import { GapBadge } from '../marks/GapBadge';
import styles from './Stepper.module.css';

/** The toolbar's "next move" indicator. Steps whose precondition is not met are disabled; Send's count is the loud one. */
export function Stepper({ steps, onGo }: { steps: readonly StepView[]; onGo: (k: Step) => void }) {
  return (
    <nav className={styles.stepper} aria-label="Next move">
      {steps.map((s, i) => (
        <span key={s.k} className={styles.item}>
          {i > 0 ? <Icon name="disc" className={styles.chv} /> : null}
          <button
            type="button"
            className={cx(styles.step, s.past && styles.past)}
            aria-current={s.current ? 'step' : undefined}
            disabled={!s.enabled}
            title={`${s.title} (${s.k})`}
            onClick={() => onGo(s.k)}
          >
            <i className={styles.n}>{s.past ? '✓' : s.k}</i>
            {s.name}
            {s.count != null && s.loud ? (
              <GapBadge solid title={`${s.count} picked, waits for you`}>
                {s.count}
              </GapBadge>
            ) : s.loud ? null : (
              <span className={styles.q}>{s.count}</span>
            )}
          </button>
        </span>
      ))}
    </nav>
  );
}
