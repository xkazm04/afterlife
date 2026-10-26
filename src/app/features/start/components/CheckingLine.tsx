import { SLOW_S, type Checking } from '../model/view';
import styles from './step.module.css';

/** "checking glab login… 4 s", live to a screen reader; from 12 s on it adds what it is still waiting on. */
export function CheckingLine({ checking }: { checking: Checking }) {
  const slow = checking.sinceS >= SLOW_S;
  return (
    <p className={styles.checking} role="status">
      checking {checking.what}… {checking.sinceS} s{slow ? <span className={styles.slow}> · still waiting on {checking.on}</span> : null}
    </p>
  );
}
