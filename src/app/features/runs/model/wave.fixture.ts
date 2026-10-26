// Test waves for the runs models: a wave with only what a test names, the rest as the fold leaves an
// absent value (an omitted key). Tests only.
import type { RunLane, RunRepo, RunWave } from '@/lib/runs/types';

const NONE = { landed: 0, parked: 0, failed: 0, budget: 0, timeout: 0 };

export const lane = (id: string, l: Partial<RunLane> = {}): RunLane => ({ lane: id, promptVersion: 'p1', ...l });

export function wave(repo: string, n: number, w: Partial<RunWave> = {}): RunWave {
  const lanes = w.lanes ?? [];
  const counts = { ...NONE };
  for (const l of lanes) if (l.outcome) counts[l.outcome] += 1;
  return { repo, wave: n, lanes, open: lanes.filter((l) => !l.outcome).length, counts, running: false, hasProposals: false, ...w };
}

export const repo = (name: string, waves: RunWave[]): RunRepo => ({ repo: name, waves, totals: { waves: waves.length, lanes: 0, counts: { ...NONE } } });
