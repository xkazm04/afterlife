'use client';

import { useState } from 'react';
import { Button } from '@/components/controls/Button';
import { Spacer } from '@/components/controls/Spacer';
import { CommandBlock } from '@/components/inspector/CommandBlock';
import type { StartData } from '@/server/actions/runs/start/types';
import { commandLines } from '@/server/actions/words';
import { branchesOf, formFor, intentOf, notReady, repoOf, type StartForm } from './model/form';
import { StartFields } from './StartFields';
import { useStartRun } from './useStartRun';
import styles from './start.module.css';

/**
 * "Start a run": pick the repo, the mode, the branch, the size and the ideas; Preview shows the server's exact
 * `afterlife run ...` and what it will and will not do; Start run confirms exactly that preview, as you, and the screen goes
 * to the live film. Nothing is spelled here and nothing runs before the click. A refusal is shown with its reason.
 */
export function StartPanel({ data }: { data: StartData }) {
  const [f, setF] = useState<StartForm>(() => formFor(data.repos[0]));
  const repo = repoOf(data, f.repo);
  const read = data.branches[f.repo];
  const branches = branchesOf(data, f.repo);
  const intent = intentOf(f, repo);
  const round = useStartRun(intent);
  const v = round.view;
  const p = v?.kind === 'preview' ? v.preview : undefined;
  const set = (patch: Partial<StartForm>) =>
    setF((cur) => (patch.repo !== undefined && patch.repo !== cur.repo ? formFor(repoOf(data, patch.repo), cur) : { ...cur, ...patch }));

  if (data.closed) return <p className={styles.note}>No run starts here: {data.closed}.</p>;
  if (data.repos.length === 0) {
    return (
      <p className={styles.note}>
        No fleet repo to run on{data.fleetError ? `: ${data.fleetError}` : ''}. Add one to .afterlife/fleet.yml, or onboard a project and save its runner block.
      </p>
    );
  }
  const waiting = notReady(f);
  return (
    <div className={styles.panel}>
      <StartFields f={f} set={set} repos={data.repos} repo={repo} branches={branches} branchReason={read && !read.ok ? read.reason : undefined} locked={round.sending} />
      {v?.kind === 'refused' ? <p className={styles.refused} role="alert">Not started: {v.reason}. Nothing ran.</p> : null}
      {p ? (
        <section className={styles.preview} aria-label="What Start run does">
          <p className={styles.note}>{p.summary}</p>
          <CommandBlock commands={commandLines(p)} label={`The command for ${p.title}`} />
          <ul className={styles.notes}>
            {(p.notes ?? []).map((n) => <li key={n}>{n}</li>)}
          </ul>
        </section>
      ) : null}
      <div className={styles.foot}>
        <span className={styles.dim} role="status">
          {round.outcome ?? (waiting ? `To preview: ${waiting}.` : p ? 'This exact command starts on the click, as you.' : 'Preview shows the exact command; nothing runs until Start run.')}
        </span>
        <Spacer />
        <Button onClick={round.ask} disabled={!intent || round.asking || round.sending}>{round.asking ? 'Asking…' : 'Preview'}</Button>
        <Button variant={p?.risk === 'merge' ? 'danger' : 'primary'} onClick={round.send} disabled={!p || round.sending || round.started}>
          {round.sending ? 'Starting…' : 'Start run'}
        </Button>
      </div>
    </div>
  );
}
