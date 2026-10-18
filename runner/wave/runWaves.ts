// runWaves: the runner's entry. Resolves the repo from the fleet file, numbers each wave after the ones
// already on disk (a branch or a run file), and runs them one after another. Returns a process exit code:
// 0 when every wave ran, 1 when a wave threw (its error is printed, earlier waves stay on disk).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { branchExists } from '../git/worktree';
import { loadFleet } from '../fleet/load';
import type { RunEvent } from '../../src/schemas/run';
import { waveBranch } from '../../src/schemas/run';
import type { RunOptions } from '../index';
import { makeLog, runFile } from './events';
import { loadPrompts } from './prompts';
import { reflect } from './reflect';
import { runWave } from './wave';

const AFTERLIFE_ROOT = fileURLToPath(new URL('../../', import.meta.url));
export const DEFAULT_LANE_TIMEOUT_MS = 20 * 60_000;

export const defaultFleetFile = (): string => path.join(AFTERLIFE_ROOT, '.belay', 'fleet.yml');
export const defaultRunsDir = (): string => path.join(AFTERLIFE_ROOT, '.belay', 'runs');

export async function runWaves(opts: RunOptions, emit: (e: RunEvent) => void): Promise<number> {
  const repo = loadFleet(opts.fleet ?? defaultFleetFile()).find((r) => r.slug === opts.repo);
  if (!repo) throw new Error(`runner: repo "${opts.repo}" is not in the fleet file`);
  if (!fs.existsSync(repo.path)) throw new Error(`runner: ${repo.slug} path does not exist: ${repo.path}`);
  const runsDir = opts.runsDir ?? defaultRunsDir();
  const prompts = loadPrompts();
  // A repo's own caps are ceilings on the run's: a fleet file can only make a run cheaper.
  const laneCapUsd = Math.min(opts.laneCapUsd, repo.laneCapUsd ?? Infinity);
  const waveCapUsd = Math.min(opts.waveCapUsd, repo.waveCapUsd ?? Infinity);
  const timeoutMs = opts.laneTimeoutMs ?? DEFAULT_LANE_TIMEOUT_MS;
  let wave = 0;
  try {
    for (let i = 0; i < opts.waves; i++) {
      wave = 1;
      while ((await branchExists(repo.path, waveBranch(wave))) || fs.existsSync(runFile(runsDir, repo.slug, wave))) wave++;
      const log = makeLog({ runsDir, repo: repo.slug, wave, promptVersion: prompts.version, emit });
      await runWave({ repo, opts, wave, prompts, log, laneCapUsd, waveCapUsd, timeoutMs });
      await reflect({ prompt: prompts.text.reflect, runFile: runFile(runsDir, repo.slug, wave), model: opts.model, timeoutMs, log });
    }
    return 0;
  } catch (e) {
    console.error(`runner: wave ${wave} failed: ${e instanceof Error ? e.message : String(e)}`);
    return 1;
  }
}
