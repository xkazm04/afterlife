'use client';

import type { ReactNode } from 'react';
import { Button } from '@/components/controls/Button';
import { Spacer } from '@/components/controls/Spacer';
import { PaneScroll } from '@/components/shell/PaneScroll';
import { Unread } from '@/components/shell/host';
import { Window } from '@/components/shell/Window';
import { ADD_HREF } from '../model/projects/saved';
import styles from '../start.module.css';

/**
 * /start's window while its facts are read (the screen host's facts slice, sync and fast), or while the project the URL
 * names is looked up: the real title and the Re-check button (disabled), a dash for the subtitle, the status and the
 * page. Nothing is probed until the facts land: the probe's address and whether it stands in for the app are the
 * facts'. `error`: why the facts could not be read. `missing`: a slug no project saved on this machine has.
 */
export function StartPending({ error, missing, sidebar }: { error?: string; missing?: string; sidebar?: ReactNode }) {
  return (
    <Window
      title="Projects"
      subtitle="—"
      sidebar={sidebar}
      toolbar={
        <>
          <Spacer />
          <Button variant="accent" disabled>
            Re-check
          </Button>
        </>
      }
      status={error ? 'The setup facts could not be read' : missing ? 'No such saved project' : <Unread label="steps not read yet" />}
    >
      <PaneScroll padded>
        <div className={styles.page} aria-busy={error || missing ? undefined : true}>
          {error ? (
            <p className={styles.refused} role="alert">
              The setup facts could not be read: {error}.
            </p>
          ) : missing ? (
            <header className={styles.head} role="status">
              <h2 className={styles.h2}>No project “{missing}” is saved on this machine</h2>
              <p className={styles.sub}>It may have been removed, or the link came from another machine. Pick one in the list, or add it.</p>
              <div>
                <Button variant="accent" href={ADD_HREF}>
                  Add a project
                </Button>
              </div>
            </header>
          ) : (
            <Unread label="steps not read yet" />
          )}
        </div>
      </PaneScroll>
    </Window>
  );
}
