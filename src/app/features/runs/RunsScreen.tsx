'use client';

import { useState } from 'react';
import { Reveal, Unread } from '@/components/shell/host';
import { Window } from '@/components/shell/Window';
import { MergePanel } from './components/MergePanel';
import { RunsEmpty } from './components/RunsEmpty';
import { RunsHeader } from './components/RunsHeader';
import { RunsTable, waveId } from './components/RunsTable';
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

const subtitleOf = (data: RunsData | undefined): string => {
  if (!data) return '—';
  if (data.repos.length === 0) return 'no runs yet';
  return `${data.totals.waves} wave${data.totals.waves === 1 ? '' : 's'}`;
};

/**
 * Runs: what the runner did, read from .afterlife/runs (real local files, demo and live alike). Repos, their waves, a wave's
 * lanes on Enter. A mergeable wave shows the commands to take it; nothing here writes. `fleetError`: why an invalid
 * .afterlife/fleet.yml did not read (absent when the file is fine or missing). Before the runs are read the window, the
 * totals strip (dashes) and the table's place are drawn, so nothing moves when they land.
 */
export function RunsScreen({ data, runsError, merges, mergesPending = false, fleetError }: RunsScreenProps) {
  const [selected, setSelected] = useState<string | null>(null);
  const wave = data?.repos.flatMap((r) => r.waves).find((w) => waveId(w) === selected);
  const empty = data !== undefined && data.repos.length === 0;
  const status = !data ? <Unread label="runs not read yet" /> : empty ? 'No runs in .afterlife/runs' : 'Enter or double-click a wave to open its lanes';
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
            {data ? <RunsTable repos={data.repos} selected={selected} onSelect={setSelected} /> : null}
          </Reveal>
        )}
      </div>
    </Window>
  );
}
