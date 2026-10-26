import { Button } from '@/components/controls/Button';
import type { SetupAction } from '@/server/start/wire';
import { actionTitle } from '../../model/actions';
import styles from './chat.module.css';

/** The fields a proposed action carries, as the person checks them before the preview ("group 777 · gl.acme.io · live"). */
function fieldsOf(a: SetupAction): string {
  if (a.kind === 'set-setup') return [`group ${a.groupId}`, a.host, a.mode, a.project && `project ${a.project}`].filter(Boolean).join(' · ');
  if (a.kind === 'glab-login') return `opens a terminal window: glab auth login${a.host ? ` --hostname ${a.host}` : ''}`;
  if (a.kind === 'install-glab') return 'the platform’s package manager installs glab';
  return 'saves the lines a probe confirmed';
}

/** A reply's catalogue action: what it is, then Review, which opens the server's exact preview with Confirm. */
export function ActionCard({ action, onReview }: { action: SetupAction; onReview: (a: SetupAction) => void }) {
  return (
    <div className={styles.card} data-kind={action.kind}>
      <div className={styles.cardMain}>
        <span className={styles.cardTitle}>{actionTitle(action)}</span>
        <span className={styles.cardFields}>{fieldsOf(action)}</span>
      </div>
      <Button size="mini" variant="accent" onClick={() => onReview(action)}>
        Review
      </Button>
    </div>
  );
}
