// The cycle runner: waves of headless `claude -p` lanes in worktrees of fleet repos, gated, committed to
// belay/wave-<n>, metered. The only place in the repo that reads ANTHROPIC_API_KEY. Stubs until WP1 lands.
import type { RunEvent } from '../src/schemas/run';

export interface FleetRepo {
  slug: string;
  path: string;
  base: string;
  gates: string[];
  laneCapUsd?: number;
  waveCapUsd?: number;
}

export interface RunOptions {
  repo: string;
  waves: number;
  lanes: number;
  laneCapUsd: number;
  waveCapUsd: number;
  model: string;
}

export const RUN_DEFAULTS = { waves: 1, lanes: 6, laneCapUsd: 3, waveCapUsd: 25, model: 'sonnet' } as const;

export function loadFleet(_file: string): FleetRepo[] {
  throw new Error('runner: loadFleet not implemented');
}

export async function runWaves(_opts: RunOptions, _emit: (e: RunEvent) => void): Promise<number> {
  throw new Error('runner: runWaves not implemented');
}
