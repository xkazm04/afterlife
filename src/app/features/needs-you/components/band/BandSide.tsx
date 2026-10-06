import { Button } from '@/components/controls/Button';
import { CRA } from '../../data/cra';
import type { Action, ActionId, NeedsState } from '../../model/types';
import styles from './CraBand.module.css';

/** The band's buttons: read the draft, then Ready to sign (disabled until read), then "I submitted it". */
export function BandSide({ s, dispatch }: { s: NeedsState; dispatch: (a: Action) => void }) {
  const act = (action: ActionId) => () => dispatch({ type: 'act', action });
  const st = s.status.n2;
  if (st === 'open') {
    return (
      <div className={styles.side}>
        <Button onClick={act('read-draft')}>{s.read.draft ? 'Draft read ✓' : 'Read the draft'}</Button>
        <Button
          variant="primary"
          disabled={!s.read.draft}
          title={s.read.draft ? undefined : 'Read the draft first: ready to sign means a person read it'}
          onClick={act('stage-n2')}
        >
          Ready to sign
        </Button>
      </div>
    );
  }
  if (st === 'staged') {
    return (
      <div className={styles.side}>
        <div className={styles.st}>
          <b className={styles.stAccent}>◆</b>
          <span>In the outbox, first in line</span>
        </div>
        <Button variant="ghost" onClick={act('unstage:n2')}>
          Take it back
        </Button>
      </div>
    );
  }
  return (
    <div className={styles.side}>
      <div className={styles.st}>
        <b className={styles.stOk}>✓</b>
        <span>Ready to sign · you submit on ENISA</span>
      </div>
      {s.submitted ? (
        <div className={styles.st}>
          <b className={styles.stOk}>✓</b>
          <span>Submission noted on {CRA.issue}</span>
        </div>
      ) : (
        <Button title={CRA.submitCommand} onClick={act('submitted')}>
          I submitted it
        </Button>
      )}
    </div>
  );
}
