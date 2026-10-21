// One wave: wave.start, the plan step (read-only, in a detached worktree of base), the lanes one after
// another under the caps, then wave.end - mergeable only when something landed AND the gates are green on
// the wave branch itself. Nothing here pushes or merges: belay/wave-<n> is left for a person.
import { bashPrefixes } from '../agent/permissions';
import { callClaude } from '../agent/spawn';
import { addWorktree, removeWorktree, resolveRef, sweepStaleWorktrees, worktreeDir } from '../git/worktree';
import { runLane } from '../lane/run';
import { saveGateLog } from '../lane/patch';
import { GATE_RETRIES, redReason, runGates } from '../lane/verify';
import { git } from '../proc/proc';
import { waveBranch } from '../../src/schemas/run';
import type { FleetRepo, RunOptions } from '../index';
import type { Log } from './events';
import { jsonLines, parsePlan, planPrompt, type PlanItem } from './plan';
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
  /** The run files' root; a lane that did not land saves its patch under it. */
  runsDir: string;
  /** Stack this wave on an earlier, unmerged wave branch instead of repo.base. */
  baseRef?: string;
}

export interface WaveResult {
  costUsd: number;
  landed: number;
  branch: string;
  /** One block per lane, `### <lane> (<outcome>)` + its final text, for the reflect step. */
  notes: string[];
  /** Set when setup or a gate was red on base itself: the wave ended before the plan, nothing was spent. */
  baseRed?: string;
}

/** Setup then the gates in the fresh wave worktree, on base: why base is red, or null when it is green. */
async function baseCheck(repo: FleetRepo, waveDir: string, timeoutMs: number): Promise<{ red: string | null; flaky: string[]; output?: string }> {
  const setup = await runGates(repo.setup ?? [], waveDir, timeoutMs);
  if (!setup.ok) return { red: redReason('base setup', setup), flaky: [], output: setup.output };
  const gates = await runGates(repo.gates, waveDir, timeoutMs, GATE_RETRIES);
  return { red: gates.ok ? null : redReason('base gate', gates), flaky: gates.flaky ?? [], output: gates.output };
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
    const voided = a.timedOut ? 'timeout' : a.isError ? 'error' : dirty ? 'dirty' : undefined;
    const items = voided ? [] : parsePlan(a.text, c.opts.lanes);
    c.log({ kind: 'wave.plan', raw: jsonLines(a.text), parsed: items.length, items: items.map((i) => i.lane), ...(voided ? { voided } : {}) });
    return { items, costUsd };
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
  // One fixed path for every wave's own worktree (waves of a repo run one at a time, and it is removed at wave end):
  // cargo hashes a workspace crate's path into its build, so a path per wave grew a shared target dir every wave.
  const waveDir = worktreeDir(repo.path, 'belay-wave-head');
  log({ kind: 'wave.start', base, lanes: c.opts.lanes, laneCapUsd: c.laneCapUsd, waveCapUsd: c.waveCapUsd, model: c.opts.model });
  // Dirs an interrupted run or a half-failed removal left behind (unregistered, so no live wave's).
  await sweepStaleWorktrees(repo.path);
  await addWorktree(repo.path, waveDir, baseSha, branch);
  let cost = 0;
  let landed = 0;
  const notes: string[] = [];
  const bash = bashPrefixes([...(repo.setup ?? []), ...repo.gates], repo.laneTools);
  try {
    // A gate red on base fails every lane for a reason that is not its own: stop before any model spend.
    const base: { red: string | null; flaky: string[]; output?: string } = c.opts.skipBaseGates ? { red: null, flaky: [] } : await baseCheck(repo, waveDir, c.timeoutMs);
    const flaky = [...base.flaky];
    const red = base.red;
    if (red) {
      const gateLog = saveGateLog(c.runsDir, { repo: repo.slug, wave, what: 'base' }, base.output);
      log({ kind: 'wave.end', branch, mergeable: false, costUsd: 0, branchKept: false, baseRed: red, ...(flaky.length ? { flaky } : {}), ...(gateLog ? { gateLog } : {}) });
      return { costUsd: 0, landed: 0, branch, notes: [], baseRed: red };
    }
    const p = await plan(c, baseSha);
    cost += p.costUsd;
    for (const item of p.items) {
      if (cost >= c.waveCapUsd) break;
      const r = await runLane({ repoPath: repo.path, gates: repo.gates, setup: repo.setup ?? [], bash, baseSha, wave, waveDir, model: c.opts.model, laneCapUsd: c.laneCapUsd, timeoutMs: c.timeoutMs, lanePromptText: c.prompts.text.lane, log, runsDir: c.runsDir, repo: repo.slug }, item);
      cost += r.costUsd;
      if (r.outcome === 'landed') landed++;
      const why = r.parkReason ? `Runner's reason: ${r.parkReason}\n` : '';
      notes.push(`### ${item.lane} (${r.outcome})\n${why}${r.text.trim() || '(no final text)'}`);
    }
    let green = false;
    if (landed > 0 && (await runGates(repo.setup ?? [], waveDir, c.timeoutMs)).ok) {
      const wg = await runGates(repo.gates, waveDir, c.timeoutMs, GATE_RETRIES);
      green = wg.ok;
      flaky.push(...(wg.flaky ?? []));
    }
    log({ kind: 'wave.end', branch, mergeable: green, costUsd: cost, branchKept: landed > 0, ...(flaky.length ? { flaky } : {}) });
  } finally {
    await removeWorktree(repo.path, waveDir, landed > 0 ? undefined : branch);
  }
  return { costUsd: cost, landed, branch, notes };
}
