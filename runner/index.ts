// The cycle runner: waves of headless `claude -p` lanes in worktrees of fleet repos, gated, committed to
// belay/wave-<n>, metered. The only place in the repo that touches the Anthropic key (runner/agent/spawn.ts).
// The wire contract is src/schemas/run (belay.run/0); the implementation is split by concern under runner/.
export type { RunEvent } from '../src/schemas/run';

export interface FleetRepo {
  slug: string;
  path: string;
  base: string;
  gates: string[];
  /** Commands run in every fresh worktree before the lane and before the wave gate (dependency installs). */
  setup?: string[];
  /** Extra Bash prefixes a lane may run besides those derived from gates and setup (e.g. `npx vitest run`). */
  laneTools?: string[];
  /** Refuse a lane whose change adds trailing whitespace or a new run of two blank lines (lane/hygiene.ts). */
  diffCheck?: boolean;
  laneCapUsd?: number;
  waveCapUsd?: number;
  /** P4 frontier lanes and T3 measurement (fleet/frontier.ts): absent = neither. */
  frontier?: Frontier;
  /** The repo's GitLab path_with_namespace: only Fleet's cost join reads it (src/lib/runs/desk/join.ts). */
  gitlab?: string;
}

export type { TechMetric, TechParse } from '../src/schemas/run/tech';
import type { TechMetric } from '../src/schemas/run/tech';

/** A repo's technology objective: worked by a frontier lane when the plan under-fills, judged by its metrics. */
export interface Frontier {
  objective: string;
  metrics: TechMetric[];
}

export interface RunOptions {
  repo: string;
  waves: number;
  lanes: number;
  laneCapUsd: number;
  waveCapUsd: number;
  model: string;
  /** Fleet file; default <afterlife>/.belay/fleet.yml. */
  fleet?: string;
  /** Where run files go; default <afterlife>/.belay/runs. */
  runsDir?: string;
  /** Skip the check that base's setup and gates are green before the plan (a person knows they are red). */
  skipBaseGates?: boolean;
  /** Per-lane wall-clock ceiling; default 20 minutes. */
  laneTimeoutMs?: number;
}

export const RUN_DEFAULTS = { waves: 1, lanes: 6, laneCapUsd: 3, waveCapUsd: 25, model: 'sonnet' } as const;

export { loadFleet } from './fleet/load';
export { runWaves } from './wave/runWaves';
