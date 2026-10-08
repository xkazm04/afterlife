import type { ComponentProps } from 'react';
import { CommandBlock } from '@/components/inspector/CommandBlock';
import { DiffBlock } from '@/components/inspector/blocks/DiffBlock';
import { parseDiff } from '@/components/inspector/blocks/diff';
import { Chip } from '@/components/status/chip/Chip';
import { elide } from './outcome';
import type { WriteEntry } from './useServerWrites';
import styles from './ServerCommands.module.css';

const RISK_WORD = { low: 'low risk', policy: 'changes policy', merge: 'merges' } as const;

/**
 * The exact commands the server planned for one write, shown before anything runs: its mode (demo: planned against the
 * demo group and never executed; live: runs as you), its risk, and the commands. A refusal shows the server's reason.
 * While the server plans, `fallback` (the screen's own description of the commands) stands in, marked as such. A long
 * field (a whole file's content) is folded in the command and shown as the server's diff underneath; the full command is
 * the command block's tooltip.
 */
export function ServerCommands({
  entry,
  fallback,
  label,
}: {
  entry: WriteEntry | undefined;
  fallback?: ComponentProps<typeof CommandBlock>['commands'];
  label: string;
}) {
  if (!entry || entry.status === 'planning') {
    return (
      <div className={styles.w}>
        <span className={styles.meta}>
          <Chip compact tone="pending">
            planning on the server…
          </Chip>
        </span>
        {fallback && fallback.length ? <CommandBlock commands={fallback} label={label} prompt={false} /> : null}
      </div>
    );
  }
  if (entry.status === 'refused') {
    return (
      <div className={styles.w}>
        <p className={styles.refused} role="status">
          <b>The server will not send this:</b> {entry.reason}
        </p>
      </div>
    );
  }
  const p = entry.preview;
  const shown = p.commands.map((c) => elide(c.display));
  const folded = shown.some((c) => c.elided);
  return (
    <div className={styles.w}>
      <span className={styles.meta}>
        <Chip compact tone={p.mode === 'live' ? 'you' : 'neutral'} title={p.mode === 'live' ? 'Confirming runs these commands as your glab login' : 'Planned against the demo group; confirming only simulates'}>
          {p.mode === 'live' ? 'live · runs as you' : 'demo · planned, never executed'}
        </Chip>
        <Chip compact tone={p.risk === 'low' ? 'plain' : 'accent'}>{RISK_WORD[p.risk]}</Chip>
        <span className={styles.sum}>{p.summary}</span>
      </span>
      <div title={folded ? p.commands.map((c) => c.display).join('\n') : undefined}>
        <CommandBlock commands={shown.map((c) => c.text)} label={label} prompt={false} />
      </div>
      {folded && p.diff.length ? <DiffBlock lines={parseDiff(p.diff)} label={`What ${label.toLowerCase()} writes`} /> : null}
    </div>
  );
}
