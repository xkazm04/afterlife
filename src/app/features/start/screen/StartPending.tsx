'use client';

import { Button } from '@/components/controls/Button';
import { Spacer } from '@/components/controls/Spacer';
import { PaneScroll } from '@/components/shell/PaneScroll';
import { Unread } from '@/components/shell/host';
import { Window } from '@/components/shell/Window';
import styles from '../start.module.css';

/**
 * /start's window while its facts are read (the screen host's facts slice, sync and fast): the real title and the
 * Re-check button (disabled), a dash for the subtitle, the status and the page. Nothing is probed until the facts land:
 * the probe's address and whether it stands in for the app are the facts'. `error`: why the facts could not be read.
 */
export function StartPending({ error }: { error?: string }) {
  return (
    <Window
      title="Set up my first project"
      subtitle="—"
      toolbar={
        <>
          <Spacer />
          <Button variant="accent" disabled>
            Re-check
          </Button>
        </>
      }
      status={error ? 'The setup facts could not be read' : <Unread label="steps not read yet" />}
    >
      <PaneScroll padded>
        <div className={styles.page} aria-busy={error ? undefined : true}>
          {error ? (
            <p className={styles.refused} role="alert">
              The setup facts could not be read: {error}.
            </p>
          ) : (
            <Unread label="steps not read yet" />
          )}
        </div>
      </PaneScroll>
    </Window>
  );
}
