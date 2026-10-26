'use client';

import { Unread } from '@/components/shell/host';
import { Window } from '@/components/shell/Window';
import type { StartData } from '@/server/actions/runs/start/types';
import { useNewRun } from '../start/NewRun';
import styles from './TheaterPending.module.css';

/**
 * The Theater window while its film is read (the screen host's live and film slices): the real title, the toolbar's
 * "New run…" once the panel's data is read, a dash for the subtitle and the status, and the stage's whole place. Nothing
 * plays and nothing is polled until the film arrives. `error`: why the film could not be read, said in the stage.
 */
export function TheaterPending({ start, error }: { start?: StartData; error?: string }) {
  const newRun = useNewRun(start);
  return (
    <Window title="Theater" subtitle="—" toolbar={newRun.button} status={error ? 'The film could not be read' : <Unread label="film not read yet" />}>
      <div className={styles.pane} aria-busy={error ? undefined : true}>
        {error ? (
          <p className={styles.note} role="alert">
            The film could not be read: {error}.
          </p>
        ) : (
          <Unread label="film not read yet" />
        )}
      </div>
      {newRun.sheet}
    </Window>
  );
}
