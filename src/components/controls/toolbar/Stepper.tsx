import { Icon } from '@/components/icons/Icon';
import { NeedsYouBadge } from '@/components/status/NeedsYouBadge';
import styles from './Stepper.module.css';

/** One step of a Stepper. `count` is the small number after the name; `loud` makes it the amber "waits for you" badge. */
export interface StepperStep<K extends string | number> {
  k: K;
  name: string;
  title: string;
  /** A step whose precondition is not met is disabled. */
  enabled: boolean;
  current: boolean;
  /** Done: the number becomes a tick. */
  past: boolean;
  count: number | null;
  loud: boolean;
}

/**
 * Segmented step progress for a toolbar ("Pick › Preview › Send › After merge"). The current step is raised, past
 * steps show a tick, and a loud count is the one amber element. `label` names the group for assistive tech.
 */
export function Stepper<K extends string | number>({
  steps,
  onGo,
  label,
}: {
  steps: readonly StepperStep<K>[];
  onGo: (k: K) => void;
  label: string;
}) {
  return (
    <nav className={styles.stepper} aria-label={label}>
      {steps.map((s, i) => (
        <span key={s.k} className={styles.item}>
          {i > 0 ? <Icon name="disc" className={styles.chv} /> : null}
          <button
            type="button"
            className={s.past ? `${styles.step} ${styles.past}` : styles.step}
            aria-current={s.current ? 'step' : undefined}
            disabled={!s.enabled}
            title={`${s.title} (${s.k})`}
            onClick={() => onGo(s.k)}
          >
            <i className={styles.n}>{s.past ? '✓' : s.k}</i>
            {s.name}
            {s.count != null && s.loud ? (
              <NeedsYouBadge small count={s.count} title={`${s.count} picked, waits for you`} />
            ) : s.loud ? null : (
              <span className={styles.q}>{s.count}</span>
            )}
          </button>
        </span>
      ))}
    </nav>
  );
}
