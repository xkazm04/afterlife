'use client';

import type { ReactNode } from 'react';
import { Button } from '@/components/controls/Button';
import { Spacer } from '@/components/controls/Spacer';
import { CommandBlock } from '@/components/inspector/CommandBlock';
import { Sheet } from '@/components/overlays/Sheet';
import { commandLines } from '@/server/actions/words';
import type { ProjectWrite } from '../../hooks/useProjectWrite';
import styles from './write.module.css';

/**
 * A project write before it runs: the server's exact commands, what to know before the click (the restart, the
 * spend), and the file a write adds. `controls` sit above the preview (Queue's run count). Runs only on the click,
 * as the person's own login, and only the preview on screen.
 */
export function ProjectWriteSheet({ title, subtitle, write, confirm, controls, onClose }: { title: string; subtitle: string; write: ProjectWrite; confirm: string; controls?: ReactNode; onClose: () => void }) {
  const v = write.view;
  const p = v?.kind === 'preview' ? v.preview : undefined;
  return (
    <Sheet
      title={title}
      subtitle={subtitle}
      onClose={onClose}
      footer={
        <>
          <span className={styles.outcome} role="status">{write.outcome ?? (p ? `${p.commands.length} command${p.commands.length === 1 ? '' : 's'} · runs as you` : '')}</span>
          <Spacer />
          <Button onClick={onClose}>{write.done ? 'Close' : 'Cancel'}</Button>
          <Button variant={p?.risk === 'merge' ? 'danger' : 'primary'} disabled={!p || write.sending || write.done} onClick={write.send}>
            {write.sending ? 'Running…' : confirm}
          </Button>
        </>
      }
    >
      {controls}
      {!v ? <p className={styles.note}>Asking the server for the exact commands… nothing runs until you confirm.</p> : null}
      {v?.kind === 'refused' ? <p className={styles.note}>Not sent: {v.reason}. Nothing will run for it.</p> : null}
      {p ? (
        <>
          <p className={styles.note}>{p.summary}</p>
          <CommandBlock commands={commandLines(p)} label={`Commands for ${p.title}`} />
          {p.notes?.length ? (
            <ul className={styles.notes}>
              {p.notes.map((n) => <li key={n}>{n}</li>)}
            </ul>
          ) : null}
          {p.diff.length ? <pre className={styles.diff} aria-label="The file it writes">{p.diff.join('\n')}</pre> : null}
        </>
      ) : null}
    </Sheet>
  );
}
