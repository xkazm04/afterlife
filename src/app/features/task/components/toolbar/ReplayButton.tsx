import { Kbd } from '@/components/controls/Kbd';
import { ToolbarButton } from '@/components/controls/toolbar/ToolbarButton';
import styles from './toolbar.module.css';

/** Replay the verdict from the ledger (r). It re-derives; it never re-runs the agent. Off when the task has no ledger rows. */
export function ReplayButton({ running, disabled, onClick }: { running: boolean; disabled?: boolean; onClick: () => void }) {
  return (
    <ToolbarButton
      className={styles.replay}
      pressed={running}
      disabled={disabled}
      title={disabled ? 'No ledger rows to replay' : 'Replay from ledger (r)'}
      onClick={onClick}
    >
      <svg width="11" height="12" viewBox="0 0 11 12" fill="currentColor" aria-hidden="true" className={styles.play}>
        <path d="M2 1.3v9.4L9.6 6z" />
      </svg>
      <span>Replay</span>
      <Kbd>r</Kbd>
    </ToolbarButton>
  );
}
