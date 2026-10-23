import { useLeftSec } from '../../hooks/ClockProvider';
import { clockParts } from '../../model/clock/clock';
import styles from './Countdown.module.css';

/** The big digits: arithmetic from a deadline. It does not pause, and it goes grey once the packet is signed. */
export function Countdown({ signed }: { signed: boolean }) {
  const left = useLeftSec();
  const { h, m, s } = clockParts(left);
  return (
    <div className={`${styles.digits} ${signed ? styles.signed : ''}`} role="timer" aria-label={left > 0 ? 'time left' : 'overdue'} title="Arithmetic from a deadline. It does not pause.">
      {h}
      <span className={styles.u}>h</span>
      {m}
      <span className={styles.u}>m</span>
      {s}
      <span className={styles.u}>s</span>
      {left > 0 ? null : <span className={styles.u}>overdue</span>}
    </div>
  );
}
