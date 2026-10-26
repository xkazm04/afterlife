import { Icon } from '@/components/icons/Icon';
import { Kbd } from '@/components/controls/Kbd';
import { ToolbarButton } from '@/components/controls/toolbar/ToolbarButton';
import styles from './toolbar.module.css';

/**
 * Replay the verdict from the ledger (r). It re-derives; it never re-runs the agent. Off when the task has no ledger rows,
 * and while its ledger is not read yet (`unread`: it says so, never "no rows").
 */
export function ReplayButton({ running, disabled, unread, onClick }: { running: boolean; disabled?: boolean; unread?: boolean; onClick: () => void }) {
  return (
    <ToolbarButton
      className={styles.replay}
      pressed={running}
      disabled={disabled || unread}
      title={unread ? 'Replay from ledger (r) · the ledger is not read yet' : disabled ? 'No ledger rows to replay' : 'Replay from ledger (r)'}
      onClick={onClick}
    >
      <Icon name="play" />
      <span>Replay</span>
      <Kbd>r</Kbd>
    </ToolbarButton>
  );
}
