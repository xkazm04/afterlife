// runWaves: the runner's entry. Resolves the repo from the fleet file, numbers each wave after the ones
// already on disk (a branch or a run file), and runs them one after another. Returns a process exit code:
// 0 when every wave ran, 1 when a wave threw or its base was red (printed; earlier waves stay on disk), 2 when
// --onto names a branch it may not land on (nothing ran).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { branchExists, checkedOutAt, releaseOwnWorktrees } from '../git/worktree';
import { git } from '../proc/proc';
import { dotDirAt } from '../proc/env';
import { loadFleet } from '../fleet/load';
import { FLEET_BASE } from '../fleet/names';
import type { RunEvent } from '../../src/schemas/run';
import { waveBranch } from '../../src/schemas/run';
import type { FleetRepo, RunOptions } from '../index';
import { makeLog, runFile } from './events';
import { loadPrompts } from './prompts';
import { waveHistory } from './history';
import { reflect } from './reflect';
import { runWave } from './wave';

const AFTERLIFE_ROOT = fileURLToPath(new URL('../../', import.meta.url));
export const DEFAULT_LANE_TIMEOUT_MS = 20 * 60_000;

export const defaultFleetFile = (): string => path.join(dotDirAt(AFTERLIFE_ROOT), 'fleet.yml');
export const defaultRunsDir = (): string => path.join(dotDirAt(AFTERLIFE_ROOT), 'runs');

/** The caps a run spends under, and what `afterlife run` prints: a repo's own caps are ceilings on the flags, so a fleet file can only make a run cheaper. */
export const runCaps = (opts: Pick<RunOptions, 'laneCapUsd' | 'waveCapUsd'>, repo: Pick<FleetRepo, 'laneCapUsd' | 'waveCapUsd'>): { laneCapUsd: number; waveCapUsd: number } => ({
  laneCapUsd: Math.min(opts.laneCapUsd, repo.laneCapUsd ?? Infinity),
  waveCapUsd: Math.min(opts.waveCapUsd, repo.waveCapUsd ?? Infinity),
});

/**
 * Why `--base` / `--onto` cannot be used (exit 2, before anything is spent), or null. Both must look like a git ref
 * (FLEET_BASE, so neither can pass git a flag); `--onto` must be an existing local branch, checked out nowhere, and not
 * given with --base.
 */
export async function refRefusal(repoPath: string, o: Pick<RunOptions, 'onto' | 'base'>): Promise<string | null> {
  if (o.base !== undefined && !FLEET_BASE.test(o.base)) return `--base ${o.base}: not a git ref or sha`;
  if (o.onto === undefined) return null;
  if (!FLEET_BASE.test(o.onto)) return `--onto ${o.onto}: not a branch name`;
  if (o.base !== undefined) return '--onto and --base cannot be combined: --onto lands on the branch as it is, from its own tip';
  if (!fs.existsSync(repoPath)) return `--onto ${o.onto}: the repo path does not exist: ${repoPath}`;
  if (!(await branchExists(repoPath, o.onto))) return `--onto ${o.onto}: no such local branch in ${repoPath}`;
  const at = await checkedOutAt(repoPath, o.onto);
  return at ? `--onto ${o.onto}: the branch is checked out at ${at}; switch that worktree off it first` : null;
}

export async function runWaves(opts: RunOptions, emit: (e: RunEvent) => void): Promise<number> {
  const repo = loadFleet(opts.fleet ?? defaultFleetFile()).find((r) => r.slug === opts.repo);
  if (!repo) throw new Error(`runner: repo "${opts.repo}" is not in the fleet file`);
  if (!fs.existsSync(repo.path)) throw new Error(`runner: ${repo.slug} path does not exist: ${repo.path}`);
  const runsDir = opts.runsDir ?? defaultRunsDir();
  const prompts = loadPrompts();
  const { laneCapUsd, waveCapUsd } = runCaps(opts, repo);
  const timeoutMs = opts.laneTimeoutMs ?? DEFAULT_LANE_TIMEOUT_MS;
  let wave = 0;
  // Waves of one run stack: wave n+1 starts from wave n's branch when wave n landed something, since the
  // person has not merged it yet. A wave that landed nothing leaves the base where it was. --base moves the first
  // wave's start; --onto is every wave's start and landing branch, so its tip carries what earlier waves landed.
  let baseRef: string | undefined = opts.onto ?? opts.base;
  const refused = await refRefusal(repo.path, opts);
  if (refused) {
    console.error(`runner: ${refused}`);
    return 2;
  }
  try {
    for (let i = 0; i < opts.waves; i++) {
      wave = 1;
      while ((await branchExists(repo.path, waveBranch(wave))) || fs.existsSync(runFile(runsDir, repo.slug, wave))) wave++;
      const log = makeLog({ runsDir, repo: repo.slug, wave, promptVersion: prompts.version, emit });
      const subjects = new Set((await git(repo.path, ['log', '--format=%s', '-n', '5000', opts.onto ?? opts.base ?? repo.base])).split(/\r?\n/));
      const history = waveHistory(runsDir, repo.slug, subjects);
      const r = await runWave({ repo, opts, wave, prompts, log, laneCapUsd, waveCapUsd, timeoutMs, history, runsDir, ...(baseRef ? { baseRef } : {}) });
      if (r.baseRed) {
        // Every later wave would start from the same red base: stop, and spend nothing on reflecting.
        console.error(`runner: ${repo.slug} is red on ${baseRef ?? repo.base} before any lane ran; wave ${wave} ended unplanned (pass --skip-base-gates to run anyway)\n${r.baseRed}`);
        return 1;
      }
      if (r.landed > 0 && !opts.onto) baseRef = r.branch;
      // A propose-only wave ran no lane: nothing to reflect on.
      if (opts.mode === 'propose') continue;
      const current = { plan: prompts.text.plan, lane: prompts.text.lane, frontier: prompts.text.frontier };
      await reflect({ prompt: prompts.text.reflect, runFile: runFile(runsDir, repo.slug, wave), model: opts.model, timeoutMs, log, notes: r.notes, current });
    }
    return 0;
  } catch (e) {
    console.error(`runner: wave ${wave} failed: ${e instanceof Error ? e.message : String(e)}`);
    return 1;
  } finally {
    releaseOwnWorktrees(repo.path);
  }
}
