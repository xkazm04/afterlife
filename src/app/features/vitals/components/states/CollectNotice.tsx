'use client';

import { useState } from 'react';
import { Button } from '@/components/controls/Button';
import { CommandBlock } from '@/components/inspector/CommandBlock';
import { copyCommand } from '@/lib/clipboard/copyCommand';
import { loginExpired } from '../../model/freshness';
import { agoWords } from '../../model/format';
import type { CollectJob } from '../../model/types';
import styles from '../../vitals.module.css';

/** A lapsed provider login: the line that said so and the exact command that renews it, to copy and run yourself. */
export function LoginExpired({ command, summary }: { command: string; summary: string }) {
  const [said, setSaid] = useState('');
  const copy = () => copyCommand(command, typeof navigator === 'undefined' ? undefined : navigator.clipboard, setSaid, `Copied ${command}`);
  return (
    <div className={styles.notice} data-tone="bad" role="alert">
      <b>Provider login expired.</b> Afterlife reads through your own CLI login, and it has lapsed: <span className={styles.mono}>{summary}</span>
      <div className={styles.cmdLine}>
        <CommandBlock commands={[command]} label="Re-login command" />
        <Button size="mini" onClick={copy}>
          Copy command
        </Button>
        {said ? <span className={styles.note} aria-live="polite">{said}</span> : null}
      </div>
      <span className={styles.note}>Run it in a terminal, then Refresh.</span>
    </div>
  );
}

/**
 * What the project's collect job is doing, above the bands (the job runs on the server; the page re-reads it): collecting
 * since when, then a failure with its reason (a lapsed login with its re-login command), or what it added. `refused`:
 * why the server would not start one. `starting`: the click is on its way. Draws nothing when no job ran.
 */
export function CollectNotice({ job, refused, starting, now }: { job?: CollectJob; refused?: string; starting?: boolean; now: string }) {
  if (refused) {
    return (
      <div className={styles.notice} data-tone="bad" role="alert">
        <b>Refresh refused.</b> <span className={styles.mono}>{refused}</span>
      </div>
    );
  }
  if (job && !job.done) {
    return (
      <div className={styles.notice} role="status" aria-busy="true">
        Collecting since {job.startedAt} (started {agoWords(job.startedAt, now)}): CI runs newer than the newest stored, then production points since the
        newest bin. A cold collect takes minutes; this page re-reads every 5 s until it is done.
      </div>
    );
  }
  if (starting) {
    return (
      <div className={styles.notice} role="status" aria-busy="true">
        Starting a collect…
      </div>
    );
  }
  if (!job) return null;
  const login = loginExpired(job.probes, job.error);
  if (login) return <LoginExpired command={login.command} summary={login.summary} />;
  if (job.error !== undefined) {
    return (
      <div className={styles.notice} data-tone="bad" role="alert">
        <b>Collect failed {agoWords(job.done, now)}.</b> <span className={styles.mono}>{job.error}</span> The bands show what was stored before.
      </div>
    );
  }
  const added = job.added;
  const prod = job.prodAdded === undefined ? '' : `, ${job.prodAdded} production point${job.prodAdded === 1 ? '' : 's'}`;
  return (
    <div className={styles.notice} role="status">
      Collected {agoWords(job.done, now)}: {added === undefined ? 'no count reported' : `${added} new run${added === 1 ? '' : 's'}`}{job.total === undefined ? '' : ` (${job.total} stored)`}{prod}.
    </div>
  );
}
