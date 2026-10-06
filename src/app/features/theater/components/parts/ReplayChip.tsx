import styles from './ReplayChip.module.css';

/**
 * The always-visible REPLAY chip: this screen shows a recorded ledger slice, not live data.
 * kit-candidate: ReplayChip (the prototype's `.replay`). `note` adds "illustrative" (Present mode).
 */
export function ReplayChip({ from, to, note }: { from: number; to: number; note?: boolean }) {
  return (
    <span className={styles.replay} title="Shown from a recorded ledger slice, not live">
      Replay · seq {from}–{to}
      {note ? <span className={styles.note}> · illustrative</span> : null}
    </span>
  );
}
