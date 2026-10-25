// Starting a cycle run from /theater (the Theater's pre-run panel): the intent the panel sends, and the server reads it
// is built from (the fleet's repos, each repo's local branches). Types only: safe to import on the client.

export const RUN_IDEAS = ['scan', 'lens-scan'] as const;
export type RunIdea = (typeof RUN_IDEAS)[number];

/** The bounds the panel offers and the validator holds: one home, so the two never disagree. */
export const RUN_BOUNDS = { waves: [1, 10], lanes: [1, 6], laneCapUsd: [0.1, 50], waveCapUsd: [0.5, 500] } as const;
export const RUN_START_DEFAULTS = { waves: 1, lanes: 6, laneCapUsd: 3, waveCapUsd: 25, model: 'sonnet' } as const;

/**
 * `belay run` for one fleet repo. `propose` runs only each wave's read-only plan: no branch, no lanes, so it takes no
 * `base`, `onto` or caps flag. `execute` lands lanes on a new `belay/wave-<n>` from `base` (absent: the fleet's base) or,
 * with `onto`, straight onto that existing local branch; `base` and `onto` are never both given.
 */
export interface StartRun {
  kind: 'start-run';
  repo: string;
  mode: 'execute' | 'propose';
  base?: string;
  onto?: string;
  waves: number;
  lanes: number;
  laneCapUsd: number;
  waveCapUsd: number;
  model: string;
  ideas: RunIdea[];
}

/** One local branch of a fleet repo, and the worktree it is checked out in (the main checkout included), if any. */
export interface RunBranch {
  name: string;
  checkedOutAt?: string;
}

export type RunBranches = { ok: true; head: string | null; branches: RunBranch[] } | { ok: false; reason: string };

/** A repo the runner may work: `.belay/fleet.yml`'s, then every saved project with a runner block (runner/fleet). */
export interface StartRepo {
  slug: string;
  path: string;
  base: string;
  laneCapUsd?: number;
  waveCapUsd?: number;
}

/** What the panel is drawn from. `closed`: why no run can start from this server at all (the hosted replay). */
export interface StartData {
  repos: StartRepo[];
  branches: Record<string, RunBranches>;
  fleetError?: string;
  closed?: string;
}
