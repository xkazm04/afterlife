// What a selection id names. A lane row is `l:<repo>:<wave>:<lane>`; `w:<repo>:<wave>` names a wave (the ledger
// keeps the wave it is narrowed to that way). The merge card follows the wave a selected lane belongs to.
import type { RunLane, RunRepo, RunWave } from '@/lib/runs/types';

export const waveId = (w: Pick<RunWave, 'repo' | 'wave'>): string => `w:${w.repo}:${w.wave}`;
export const laneId = (w: Pick<RunWave, 'repo' | 'wave'>, l: Pick<RunLane, 'lane'>): string => `l:${w.repo}:${w.wave}:${l.lane}`;

/** The wave `id` names, or the wave of the lane it names. Undefined for anything else or nothing. */
export function waveOfId(repos: readonly RunRepo[], id: string | null): RunWave | undefined {
  if (!id) return undefined;
  for (const r of repos) {
    for (const w of r.waves) {
      if (waveId(w) === id) return w;
      if (id.startsWith(`l:${w.repo}:${w.wave}:`) && w.lanes.some((l) => laneId(w, l) === id)) return w;
    }
  }
  return undefined;
}
