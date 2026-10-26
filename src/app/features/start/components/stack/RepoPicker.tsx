'use client';

import { useId, useState } from 'react';
import { Button } from '@/components/controls/Button';
import { Chip } from '@/components/status/chip/Chip';
import { useNow } from '@/lib/clock/useNow';
import type { ClaudeRepo } from '@/schemas/vitals';
import { ago, HOST_LABEL } from '../../model/stack/format';
import type { RepoView } from '../../model/view';
import styles from './stack.module.css';

function RepoRow({ r, picked, now, onPick }: { r: ClaudeRepo; picked?: string; now: number | null; onPick: (root: string) => void }) {
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
          <Button size="mini" href={`/vitals/${r.onboarded}`}>
            Open its Vitals
          </Button>
        ) : null}
        <Button size="mini" variant={here ? 'default' : 'accent'} onClick={() => onPick(r.root)} title={r.onboarded ? 'Propose again; saving replaces this project’s file' : `Pick ${r.root}`}>
          {here ? 'Picked' : r.onboarded ? 'Re-run' : 'Pick'}
        </Button>
      </div>
    </li>
  );
}

/**
 * The repo step's picker (moved from the onboard wizard's RepoStep): the repos you work in with Claude Code, newest
 * first, and a pasted path as the fallback. Picking one derives its group and proposes what to watch.
 */
export function RepoPicker({ repo }: { repo: RepoView }) {
  const [path, setPath] = useState('');
  const field = useId();
  // Ages read the wall clock once mounted, so the server's render and the client's first one agree.
  const now = useNow(60_000);
  return (
    <div className={styles.picker}>
      {repo.note ? <p className={styles.note}>{repo.note}</p> : null}
      {repo.repos.length ? (
        <ul className={styles.repos} aria-label="Repos with Claude Code history">
          {repo.repos.map((r) => (
            <RepoRow key={r.root} r={r} picked={repo.picked} now={now} onPick={repo.pick} />
          ))}
        </ul>
      ) : (
        <p className={styles.empty}>No Claude Code history names a repo here: paste the path of a git checkout.</p>
      )}
      <form
        className={styles.pathForm}
        onSubmit={(e) => {
          e.preventDefault();
          if (path.trim()) repo.pick(path.trim());
        }}
      >
        <label className={styles.detail} htmlFor={field}>
          {repo.repos.length ? 'Or a path' : 'Path'}
        </label>
        <input id={field} className={styles.input} value={path} onChange={(e) => setPath(e.target.value)} placeholder="C:\path\to\checkout" spellCheck={false} autoComplete="off" />
        <Button type="submit" disabled={!path.trim()}>
          Use this path
        </Button>
      </form>
    </div>
  );
}
