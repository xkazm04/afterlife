'use client';

import { useState } from 'react';
import { Reveal, Unread } from '@/components/shell/host';
import { Window } from '@/components/shell/Window';
import { MergePanel } from './components/MergePanel';
import { RunsEmpty } from './components/RunsEmpty';
import { RunsHeader } from './components/RunsHeader';
import { LedgerTable } from './components/LedgerTable';
import { waveOfId } from './model/select';
import type { MergeNeed } from '@/lib/runs/desk/types';
import type { RunsData } from '@/lib/runs/types';
import styles from './RunsScreen.module.css';

export interface RunsScreenProps {
  /** The runs; absent until read (the frame paints with dashes), or when `runsError` says why it could not be. */
  data?: RunsData;
  runsError?: string;
  merges?: readonly MergeNeed[];
  /** The desk's merges are still being read: a mergeable wave's card says so instead of guessing commands. */
  mergesPending?: boolean;
  fleetError?: string;
}

const HINT = 'Enter on a lane narrows to its wave, again or Esc shows every lane · click a header to sort';

const subtitleOf = (data: RunsData | undefined): string => {
  if (!data) return '—';
  if (data.repos.length === 0) return 'no runs yet';
  return `${data.totals.waves} wave${data.totals.waves === 1 ? '' : 's'}`;
};

/**
 * Runs: what the runner did, read from .afterlife/runs (real local files, demo and live alike). Every lane of every
 * wave as one row of a ledger; a selected lane's wave, when the desk says it is mergeable, shows the commands to take
 * it; nothing here writes. `fleetError`: why an invalid .afterlife/fleet.yml did not read (absent when the file is fine
 * or missing). Before the runs are read the window, the totals strip (dashes) and the table's place are drawn, so
 * nothing moves when they land.
 */
export function RunsScreen({ data, runsError, merges, mergesPending = false, fleetError }: RunsScreenProps) {
  const [selected, setSelected] = useState<string | null>(null);
  const wave = data ? waveOfId(data.repos, selected) : undefined;
  const empty = data !== undefined && data.repos.length === 0;
  const status = !data ? <Unread label="runs not read yet" /> : empty ? 'No runs in .afterlife/runs' : HINT;
  return (
    <Window title="Runs" subtitle={subtitleOf(data)} status={status}>
      <div className={styles.pane}>
        <Reveal order={1} slice="runs">
          <RunsHeader data={data} />
        </Reveal>
        {wave ? <MergePanel w={wave} needs={merges} fleetError={fleetError} pending={mergesPending} /> : null}
        {runsError ? (
          <p className={styles.empty} role="alert">
            The runs could not be read: {runsError}.
          </p>
        ) : empty ? (
          <Reveal order={2} slice="runs">
            <RunsEmpty skippedLines={data.skippedLines} />
          </Reveal>
        ) : (
          <Reveal order={2} slice="runs" className={styles.table}>
            {data ? <LedgerTable repos={data.repos} needs={merges} selected={selected} onSelect={setSelected} /> : null}
          </Reveal>
        )}
      </div>
    </Window>
  );
}
