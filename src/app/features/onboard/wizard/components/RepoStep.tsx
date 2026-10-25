'use client';

import { useId, useState } from 'react';
import { Button } from '@/components/controls/Button';
import { Chip } from '@/components/status/chip/Chip';
import type { ClaudeRepo } from '@/schemas/vitals';
import { ago, HOST_LABEL } from '../model/format';
import styles from '../wizard.module.css';

interface Props {
  repos: readonly ClaudeRepo[];
  /** Why the list is empty or partial (not this machine, the listing failed). */
  note?: string;
  picked?: string;
  busy: boolean;
  /** Wall-clock ms once mounted; null renders no ages. */
  now: number | null;
  onPick: (root: string) => void;
}

function RepoRow({ r, picked, busy, now, onPick }: Omit<Props, 'repos' | 'note'> & { r: ClaudeRepo }) {
  const here = picked === r.root;
  return (
    <li className={styles.repo} aria-current={here || undefined}>
      <div className={styles.repoMain}>
        <span className={styles.label}>{r.name}</span>
        <span className={styles.path}>{r.root}</span>
      </div>
      <div className={styles.repoMeta}>
        {r.branch ? <span className={styles.detail}>{r.branch}</span> : null}
        <Chip tone={r.hostKind === 'none' ? 'unknown' : 'plain'} compact>
          {HOST_LABEL[r.hostKind]}
        </Chip>
        {now !== null ? <span className={styles.detail} title={r.lastUsed}>{ago(r.lastUsed, now)}</span> : null}
        {r.onboarded ? <Chip tone="ok" compact>Onboarded</Chip> : null}
      </div>
      <div className={styles.repoActs}>
        {r.onboarded ? (
          <>
            <Button size="mini" variant="accent" href={`/vitals/${r.onboarded}`}>
              Open its Vitals
            </Button>
            <Button size="mini" disabled={busy} onClick={() => onPick(r.root)} title="Propose again; saving replaces this project's file">
              Re-run
            </Button>
          </>
        ) : (
          <Button size="mini" variant="accent" disabled={busy} onClick={() => onPick(r.root)} title={`Propose what to watch in ${r.root}`}>
            Pick
          </Button>
        )}
      </div>
    </li>
  );
}

/** Step 1: the repos the person already works in with Claude Code, newest first, and a pasted path as the fallback. */
export function RepoStep({ repos, note, picked, busy, now, onPick }: Props) {
  const [path, setPath] = useState('');
  const field = useId();
  return (
    <section className={styles.step} aria-label="Step 1: your repos">
      <h2 className={styles.h}>
        <span className={styles.n}>1</span> Your repos <span className={styles.aux}>{repos.length ? `${repos.length} with Claude Code history` : ''}</span>
      </h2>
      {note ? <p className={styles.note}>{note}</p> : null}
      {repos.length ? (
        <ul className={styles.repos} aria-label="Repos with Claude Code history">
          {repos.map((r) => (
            <RepoRow key={r.root} r={r} picked={picked} busy={busy} now={now} onPick={onPick} />
          ))}
        </ul>
      ) : (
        <p className={styles.empty}>No Claude Code history here: ~/.claude/projects names no repo that still exists. Paste the path of a git checkout instead.</p>
      )}
      <form
        className={styles.pathForm}
        onSubmit={(e) => {
          e.preventDefault();
          if (path.trim()) onPick(path.trim());
        }}
      >
        <label className={styles.detail} htmlFor={field}>
          {repos.length ? 'Or a path' : 'Path'}
        </label>
        <input id={field} className={styles.input} value={path} onChange={(e) => setPath(e.target.value)} placeholder="C:\path\to\checkout" spellCheck={false} autoComplete="off" />
        <Button type="submit" disabled={busy || !path.trim()}>
          Use this path
        </Button>
      </form>
    </section>
  );
}
