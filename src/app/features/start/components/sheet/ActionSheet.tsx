'use client';

import { Button } from '@/components/controls/Button';
import { Spacer } from '@/components/controls/Spacer';
import { CommandBlock } from '@/components/inspector/CommandBlock';
import { Sheet } from '@/components/overlays/Sheet';
import { Chip } from '@/components/status/chip/Chip';
import { commandLines } from '@/server/actions/words';
import type { PendingView } from '../../model/view';
import styles from './sheet.module.css';

/** The footer: the answer in words, Cancel (Close once done), and Confirm, which sends exactly the preview on screen. */
export function ActionButtons({ pending }: { pending: PendingView }) {
  const p = pending.preview?.kind === 'preview' ? pending.preview.preview : undefined;
  const ready = pending.action.kind === 'save-project' || !!p;
  return (
    <>
      <span className={styles.result} role="status">
        {pending.result ?? (p ? `${p.commands.length} command${p.commands.length === 1 ? '' : 's'} · ${p.mode === 'demo' ? 'demo: simulated' : 'runs as you'}` : '')}
      </span>
      <Spacer />
      <Button onClick={pending.cancel}>{pending.done ? 'Close' : 'Cancel'}</Button>
      <Button variant="primary" disabled={!ready || pending.busy || pending.done} onClick={pending.confirm}>
        {pending.busy ? 'Running…' : 'Confirm'}
      </Button>
    </>
  );
}

/**
 * A setup action before it runs, from Run it or the chat's card: the server's exact command(s), what to know first, the
 * settings it changes, its risk; Confirm runs exactly that preview (confirmAction with its id), then the answer shows
 * here. Nothing runs before the click; the commands are the server's, never spelled on screen.
 */
export function ActionSheet({ pending }: { pending: PendingView }) {
  const v = pending.preview;
  const p = v?.kind === 'preview' ? v.preview : undefined;
  return (
    <Sheet title={pending.title} subtitle={p ? <Chip tone="plain" compact>{`risk ${p.risk}`}</Chip> : undefined} onClose={pending.cancel} footer={<ActionButtons pending={pending} />}>
      <div className={styles.body}>
        {pending.summary ? <p className={styles.note}>{pending.summary}</p> : null}
        {pending.action.kind !== 'save-project' && !v ? <p className={styles.note}>Asking the server for the exact command… nothing runs until you confirm.</p> : null}
        {v?.kind === 'refused' ? <p className={styles.refused}>Not sent: {v.reason}</p> : null}
        {p ? (
          <>
            <p className={styles.note}>{p.summary}</p>
            {p.commands.length ? <CommandBlock commands={commandLines(p)} label={`Commands for ${p.title}`} /> : null}
            {p.notes?.length ? (
              <ul className={styles.notes}>
                {p.notes.map((n) => (
                  <li key={n}>{n}</li>
                ))}
              </ul>
            ) : null}
            {p.diff.length ? (
              <pre className={styles.diff} aria-label="The settings it changes">
                {p.diff.join('\n')}
              </pre>
            ) : null}
          </>
        ) : null}
      </div>
    </Sheet>
  );
}
