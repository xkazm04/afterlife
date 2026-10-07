'use client';

import { DiffBlock } from '@/components/inspector/blocks/DiffBlock';
import { parseDiff } from '@/components/inspector/blocks/diff';
import { CommandBlock } from '@/components/inspector/CommandBlock';
import { KeyValue } from '@/components/inspector/KeyValue';
import { commandLines, type WriteView } from '@/server/actions/words';
import styles from '../inspector.module.css';

/**
 * The arm (or disarm) MR exactly as the server planned it: what it does, the branch it creates, the commands, the file
 * diff it carries, and what to know before the click. Nothing here is written by the screen, and no MR number appears:
 * GitLab names the MR when the confirm runs.
 */
export function ArmPreview({ view }: { view: WriteView | undefined }) {
  if (!view) return <div className={styles.muted}>Asking Belay for the exact MR…</div>;
  if (view.kind === 'refused') return <div className={styles.muted}>Belay will not plan this MR: {view.reason}</div>;
  const p = view.preview;
  const [head, ...rest] = p.diff;
  const file = head?.startsWith('@@ ') ? head.slice(3) : undefined;
  return (
    <>
      <p className={styles.does}>{p.summary}</p>
      <KeyValue
        rows={[
          ['Branch', p.branch ?? 'none'],
          ['Mode', p.mode === 'demo' ? 'demo: the click only simulates; nothing is sent to GitLab' : 'live: runs as your glab login'],
        ]}
      />
      <CommandBlock commands={commandLines(p)} label="The commands the click runs" />
      <DiffBlock file={file} lines={parseDiff(file ? rest : p.diff)} label="The file diff the MR carries" />
      {p.notes?.length ? (
        <ol className={styles.notes} aria-label="Before you click">
          {p.notes.map((n) => (
            <li key={n}>{n}</li>
          ))}
        </ol>
      ) : null}
    </>
  );
}
