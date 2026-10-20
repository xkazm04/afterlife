// One wave: wave.start, the plan step (read-only, in a detached worktree of base), the lanes one after
// another under the caps, then wave.end - mergeable only when something landed AND the gates are green on
// the wave branch itself. Nothing here pushes or merges: belay/wave-<n> is left for a person.
import { bashPrefixes } from '../agent/permissions';
import { callClaude } from '../agent/spawn';
import { addWorktree, removeWorktree, resolveRef, worktreeDir } from '../git/worktree';
import { runLane } from '../lane/run';
import { runGates } from '../lane/verify';
import { git } from '../proc/proc';
import { waveBranch } from '../../src/schemas/run';
import type { FleetRepo, RunOptions } from '../index';
import type { Log } from './events';
import { parsePlan, planPrompt, type PlanItem } from './plan';
import type { Prompts } from './prompts';

export interface WaveCtx {
  repo: FleetRepo;
  opts: RunOptions;
  wave: number;
  prompts: Prompts;
  log: Log;
  laneCapUsd: number;
  waveCapUsd: number;
  timeoutMs: number;
  /** What earlier waves of this repo planned and how each lane ended, so the planner does not re-plan them. */
  history: string[];
  /** Stack this wave on an earlier, unmerged wave branch instead of repo.base. */
  baseRef?: string;
}

export interface WaveResult {
  costUsd: number;
  landed: number;
  branch: string;
  /** One block per lane, `### <lane> (<outcome>)` + its final text, for the reflect step. */
  notes: string[];
}

/** The plan step: one read-only call. A plan session that changed the worktree voids the plan. */
async function plan(c: WaveCtx, baseSha: string): Promise<{ items: PlanItem[]; costUsd: number }> {
  const dir = worktreeDir(c.repo.path, `belay-wave-${c.wave}-plan`);
  await addWorktree(c.repo.path, dir, baseSha);
  try {
    const a = await callClaude({ prompt: planPrompt(c.prompts.text.plan, c.repo, c.opts.lanes, c.history, c.baseRef), cwd: dir, model: c.opts.model, timeoutMs: c.timeoutMs, permissions: { step: 'plan' } });
    const costUsd = a.costUsd ?? 0;
    if (a.usage) c.log({ kind: 'lane.usage', lane: 'plan', model: a.model ?? c.opts.model, ...a.usage, costUsd });
    const dirty = (await git(dir, ['status', '--porcelain'])) !== '';
    return { items: a.timedOut || a.isError || dirty ? [] : parsePlan(a.text, c.opts.lanes), costUsd };
  } finally {
    await removeWorktree(c.repo.path, dir);
  }
}

/** Runs the wave. The wave branch exists only if a lane landed on it. */
export async function runWave(c: WaveCtx): Promise<WaveResult> {
  const { repo, log, wave } = c;
  const base = c.baseRef ?? repo.base;
  const baseSha = await resolveRef(repo.path, base);
  const branch = waveBranch(wave);
  const waveDir = worktreeDir(repo.path, `belay-wave-${wave}`);
  log({ kind: 'wave.start', base, lanes: c.opts.lanes, laneCapUsd: c.laneCapUsd, waveCapUsd: c.waveCapUsd, model: c.opts.model });
  await addWorktree(repo.path, waveDir, baseSha, branch);
  let cost = 0;
  let landed = 0;
  const notes: string[] = [];
  const bash = bashPrefixes([...(repo.setup ?? []), ...repo.gates], repo.laneTools);
  try {
    const p = await plan(c, baseSha);
    cost += p.costUsd;
    for (const item of p.items) {
      if (cost >= c.waveCapUsd) break;
      const r = await runLane({ repoPath: repo.path, gates: repo.gates, setup: repo.setup ?? [], bash, baseSha, wave, waveDir, model: c.opts.model, laneCapUsd: c.laneCapUsd, timeoutMs: c.timeoutMs, lanePromptText: c.prompts.text.lane, log }, item);
      cost += r.costUsd;
      if (r.outcome === 'landed') landed++;
      notes.push(`### ${item.lane} (${r.outcome})
${r.text.trim() || '(no final text)'}`);
    }
    const green = landed > 0 && (await runGates(repo.setup ?? [], waveDir, c.timeoutMs)).ok && (await runGates(repo.gates, waveDir, c.timeoutMs)).ok;
    log({ kind: 'wave.end', branch, mergeable: green, costUsd: cost });
  } finally {
    await removeWorktree(repo.path, waveDir, landed > 0 ? undefined : branch);
  }
  return { costUsd: cost, landed, branch, notes };
}
