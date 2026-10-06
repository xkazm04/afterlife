import { clockParts } from '../../model/clock/clock';
import styles from './Countdown.module.css';

/** The big digits: arithmetic from a deadline. It does not pause, and it goes grey once the packet is signed. */
export function Countdown({ leftSec, signed }: { leftSec: number; signed: boolean }) {
  const { h, m, s } = clockParts(leftSec);
  return (
    <div className={`${styles.digits} ${signed ? styles.signed : ''}`} role="timer" aria-label="time left" title="Arithmetic from a deadline. It does not pause.">
      {h}
      <span className={styles.u}>h</span>
      {m}
      <span className={styles.u}>m</span>
      {s}
      <span className={styles.u}>s</span>
    </div>
  );
}
