'use client';

// Runs on the screen host (docs/features/screen-host.md). Two slices: `runs` (the runner's .afterlife/runs files, fast)
// and `merges` (the desk's merge decisions and fleet.yml's error: git, up to seconds; loopback only, since its commands
// name this machine's checkouts). The window, its title and the table's place paint in the click's frame.
// Reveal order:
//   0  window chrome                                   at once
//   1  totals strip (dashes until read)                runs
//   2  the lane ledger, or the empty note              runs
//   -  a selected lane's mergeable wave: its card fills its commands in place, and the wave state chips say whether
//      there is anything to take, when `merges` lands
import type { MergeNeed } from '@/lib/runs/desk/types';
import type { RunsData } from '@/lib/runs/types';
import { useSlice, type ScreenDef } from '@/components/shell/host';
import { RunsScreen } from '../RunsScreen';

export interface MergesSlice {
  merges: MergeNeed[];
  fleetError?: string;
}

function RunsFrame() {
  const runs = useSlice<RunsData>('runs');
  const merges = useSlice<MergesSlice>('merges');
  return (
    <RunsScreen
      data={runs.state === 'ok' ? runs.data : undefined}
      runsError={runs.state === 'error' ? runs.reason : undefined}
      merges={merges.state === 'ok' ? merges.data.merges : undefined}
      mergesPending={merges.state === 'unread'}
      fleetError={merges.state === 'ok' ? merges.data.fleetError : undefined}
    />
  );
}

export const screens: readonly ScreenDef[] = [{ key: 'runs', ready: true, slices: ['runs', 'merges'], Frame: RunsFrame, title: () => 'Afterlife · Runs' }];
