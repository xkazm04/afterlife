import type { Film } from '../../model/types';
import styles from './ReplayChip.module.css';

export const ILLUSTRATIVE_TITLE = 'An illustrative ledger slice, invented for the demo: not a recorded run, not live';
export const LEDGER_TITLE = "Read from belay-ledger, the project's hash-chained ledger: a past run, not live";

/**
 * The always-visible REPLAY chip, the same in the window and in present. The illustrative film's says so, every time;
 * a real film's names its source: belay-ledger, the MR (when one take is meant) and the seq range.
 */
export function ReplayChip({ source, from, to, mr }: { source: Film['source']; from: number; to: number; mr?: number }) {
  if (source === 'illustrative') {
    return (
      <span className={styles.replay} title={ILLUSTRATIVE_TITLE}>
        Replay · seq {from}–{to}
        <span className={styles.note}> · illustrative</span>
      </span>
    );
  }
  return (
    <span className={styles.replay} title={LEDGER_TITLE}>
      Replay · belay-ledger{mr != null ? ` · !${mr}` : ''} · seq {from}–{to}
    </span>
  );
}
