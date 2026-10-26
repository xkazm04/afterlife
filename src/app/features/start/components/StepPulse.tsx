import type { StepState } from '../model/types';
import styles from './pulse.module.css';

const WORD: Record<StepState, string> = { done: 'done', checking: 'checking now', blocked: 'blocked', todo: 'not reached', you: 'waits for you' };
const GLYPH: Partial<Record<StepState, string>> = { done: '✓', blocked: '✕' };

/**
 * A step's mark: a breathing ring while its check runs (no spinner: it scales and fades, 2.2 s), a check once done, a
 * cross when blocked, the one amber dot when it waits for a person, a hollow dot before it is reached. Under reduced
 * motion the ring stands still. Its state is also said in words (the label), never by colour alone.
 */
export function StepPulse({ state, size = 'md' }: { state: StepState; size?: 'sm' | 'md' }) {
  return (
    <span className={styles.pulse} data-state={state} data-size={size} role="img" aria-label={WORD[state]}>
      {state === 'checking' ? <span className={styles.ring} aria-hidden="true" /> : null}
      <span className={styles.core} aria-hidden="true">
        {GLYPH[state] ?? ''}
      </span>
    </span>
  );
}
