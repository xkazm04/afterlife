'use client';

import { useState } from 'react';
import { Window } from '@/components/shell/Window';
import { MergePanel } from './components/MergePanel';
import { RunsEmpty } from './components/RunsEmpty';
import { RunsHeader } from './components/RunsHeader';
import { RunsTable, waveId } from './components/RunsTable';
import type { MergeNeed } from '@/lib/runs/desk/types';
import type { RunsData } from '@/lib/runs/types';
import styles from './RunsScreen.module.css';

/**
 * Runs: what the runner did, read from .belay/runs (real local files, demo and live alike). Repos, their waves, a wave's
 * lanes on Enter. A mergeable wave shows the commands to take it; nothing here writes.
 */
export function RunsScreen({ data, merges }: { data: RunsData; merges?: readonly MergeNeed[] }) {
  const [selected, setSelected] = useState<string | null>(null);
  const wave = data.repos.flatMap((r) => r.waves).find((w) => waveId(w) === selected);
  const empty = data.repos.length === 0;
  return (
    <Window title="Runs" subtitle={empty ? 'no runs yet' : `${data.totals.waves} wave${data.totals.waves === 1 ? '' : 's'}`} status={empty ? 'No runs in .belay/runs' : 'Enter or double-click a wave to open its lanes'}>
      <div className={styles.pane}>
        <RunsHeader data={data} />
        {wave ? <MergePanel w={wave} needs={merges} /> : null}
        {empty ? (
          <RunsEmpty skippedLines={data.skippedLines} />
        ) : (
          <div className={styles.table}>
            <RunsTable repos={data.repos} selected={selected} onSelect={setSelected} />
          </div>
        )}
      </div>
    </Window>
  );
}
