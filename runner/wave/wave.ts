// One wave: wave.start, the plan step (read-only, in a detached worktree of base), the lanes one after
// another under the caps (plus one frontier lane when the plan under-filled and the repo has a frontier), the
// T3 measurement of a frontier repo (wave.tech), then wave.end - mergeable only when something landed AND the gates
// are green on the wave branch itself. Nothing here pushes or merges: belay/wave-<n> (or the --onto branch) is left
// for a person. A propose-only wave (--mode propose) is wave.start, the plan and wave.end, nothing else.
import { bashPrefixes } from '../agent/permissions';
import { addWorktree, checkoutWorktree, claimOwnWorktrees, removeWorktree, resolveRef, sweepStaleWorktrees, worktreeDir } from '../git/worktree';
import { runLane, type FrontierBrief } from '../lane/run';
import { measureWave } from '../tech/measure';
import { frontierItem, frontierPrompt, wantsFrontier } from './frontier';
import { saveGateLog } from '../lane/patch';
import { GATE_RETRIES, redReason, runGates } from '../lane/verify';
import { git } from '../proc/proc';
import { waveBranch } from '../../src/schemas/run';
import type { FleetRepo, RunOptions } from '../index';
import type { Log } from './events';
import type { PlanItem } from './plan';
import { plan } from './planStep';
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

/** A propose-only wave: wave.start, the plan, wave.end. No setup, gates, lanes or wave branch; the plan's items are the proposal. */
async function proposeWave(c: WaveCtx, base: string, baseSha: string, branch: string): Promise<WaveResult> {
  const onto = c.opts.onto ? { onto: true as const } : {};
  c.log({ kind: 'wave.start', base, lanes: c.opts.lanes, laneCapUsd: c.laneCapUsd, waveCapUsd: c.waveCapUsd, model: c.opts.model, branch, mode: 'propose', ...onto });
  await sweepStaleWorktrees(c.repo.path);
  const p = await plan(c, baseSha);
  c.log({ kind: 'wave.end', branch, mergeable: false, costUsd: p.costUsd, branchKept: false, landed: 0, proposeOnly: true });
  return { costUsd: p.costUsd, landed: 0, branch, notes: [] };
}

/** Runs the wave. A new wave branch exists only if a lane landed on it; an `--onto` branch is never deleted. */
export async function runWave(c: WaveCtx): Promise<WaveResult> {
  const { repo, log, wave } = c;
  const onto = c.opts.onto;
  const base = c.baseRef ?? repo.base;
  const baseSha = await resolveRef(repo.path, base);
  const branch = onto ?? waveBranch(wave);
  if (c.opts.mode === 'propose') {
    for (const d of await claimOwnWorktrees(repo.path)) console.error(`runner: removed ${d}, left registered by a stopped run`);
    return proposeWave(c, base, baseSha, branch);
  }
  // One fixed path for every wave's own worktree (waves of a repo run one at a time, and it is removed at wave end):
  // cargo hashes a workspace crate's path into its build, so a path per wave grew a shared target dir every wave.
  const waveDir = worktreeDir(repo.path, 'belay-wave-head');
  // What a run stopped mid-wave left registered at the fixed paths (its lane branch too) - before wave.start, so a
  // refusal (another live run) writes no run file - then the dirs left behind unregistered.
  for (const d of await claimOwnWorktrees(repo.path)) console.error(`runner: removed ${d}, left registered by a stopped run`);
  log({ kind: 'wave.start', base, lanes: c.opts.lanes, laneCapUsd: c.laneCapUsd, waveCapUsd: c.waveCapUsd, model: c.opts.model, branch, ...(onto ? { onto: true as const } : {}) });
  await sweepStaleWorktrees(repo.path);
  // --onto: the existing branch itself is checked out (its tip is base), so lanes start from it and land on it.
  if (onto) await checkoutWorktree(repo.path, waveDir, onto);
  else await addWorktree(repo.path, waveDir, baseSha, branch);
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
      log({ kind: 'wave.end', branch, mergeable: false, costUsd: 0, branchKept: Boolean(onto), landed: 0, baseRed: red, ...(flaky.length ? { flaky } : {}), ...(gateLog ? { gateLog } : {}) });
      return { costUsd: 0, landed: 0, branch, notes: [], baseRed: red };
    }
    const p = await plan(c, baseSha);
    cost += p.costUsd;
    // A frontier lane runs after the planned ones when the plan under-filled (wave/frontier.ts).
    const items: { item: PlanItem; frontier?: true }[] = p.items.map((item) => ({ item }));
    if (wantsFrontier(repo, p.items.length, c.opts.lanes)) items.push({ item: frontierItem(repo), frontier: true });
    const text = c.prompts.text;
    for (const { item, frontier } of items) {
      // A lane may spend only what the wave has left (whole cents, rounded down), so its cap is the wave's too.
      const room = Math.floor((c.waveCapUsd - cost) * 100) / 100;
      if (room <= 0) break;
      // Each lane starts from the wave branch's tip, so it sees the lanes that landed before it: two lanes cutting the
      // same file (a split and its wiring in lib.rs) stack instead of conflicting on the cherry-pick.
      const tip = await git(waveDir, ['rev-parse', 'HEAD']);
      const laneCapUsd = Math.min(c.laneCapUsd, room);
      const ctx = { repoPath: repo.path, gates: repo.gates, setup: repo.setup ?? [], bash, ...(repo.diffCheck ? { diffCheck: true } : {}), baseSha: tip, wave, waveDir, model: c.opts.model, laneCapUsd, timeoutMs: c.timeoutMs };
      const brief: FrontierBrief | undefined = frontier ? { prompt: frontierPrompt(text.lane, text.frontier, repo, laneCapUsd, { gates: repo.gates, commands: bash }) } : undefined;
      const r = await runLane({ ...ctx, lanePromptText: text.lane, reviewPromptText: text.review, repairPromptText: text.repair, log, runsDir: c.runsDir, repo: repo.slug }, item, brief);
      cost += r.costUsd;
      if (r.outcome === 'landed') landed++;
      // The failure lines of a red gate's whole output: a log's tail is often a runner's boilerplate, not the failure.
      const fails = r.failures?.length ? `Failure lines from the red gate's whole output:\n${r.failures.map((l) => `    ${l}`).join('\n')}\n` : '';
      const why = r.parkReason ? `Runner's reason: ${r.parkReason}\n${fails}` : fails;
      // The plan item itself (its axis-tagged why and its challenge), so reflect judges a lane against what it was asked.
      const asked = `Planned why: ${item.why || '(none)'}\nPlanned challenge: ${item.challenge || '(none)'}\n`;
      notes.push(`### ${item.lane} (${r.outcome})\n${asked}${why}${r.text.trim() || '(no final text)'}`);
    }
    let green = false;
    let waveLog: string | undefined;
    const setup = landed > 0 ? await runGates(repo.setup ?? [], waveDir, c.timeoutMs) : null;
    if (setup && !setup.ok) {
      // Setup red on the landed tip: the gates never ran, so the setup's own output is the wave's gate log.
      waveLog = saveGateLog(c.runsDir, { repo: repo.slug, wave, what: 'wave' }, setup.output);
      console.error(`runner: ${repo.slug} wave ${wave}: ${redReason('wave setup', setup).split('\n')[0]}`);
    } else if (setup) {
      const wg = await runGates(repo.gates, waveDir, c.timeoutMs, GATE_RETRIES);
      green = wg.ok;
      flaky.push(...(wg.flaky ?? []));
      // The wave gate's output when it was red or needed a rerun, so a flake at the wave gate leaves its first failure.
      waveLog = saveGateLog(c.runsDir, { repo: repo.slug, wave, what: 'wave' }, wg.output);
    }
    // T3: a frontier repo's metrics on the wave base and on the tip, when the tip holds anything to measure.
    if (repo.frontier && landed > 0) await measureWave({ repo, baseSha, tipSha: await git(waveDir, ['rev-parse', 'HEAD']), timeoutMs: c.timeoutMs, log });
    log({ kind: 'wave.end', branch, mergeable: green, costUsd: cost, branchKept: landed > 0 || Boolean(onto), landed, ...(flaky.length ? { flaky } : {}), ...(waveLog ? { gateLog: waveLog } : {}) });
  } finally {
    await removeWorktree(repo.path, waveDir, landed > 0 || onto ? undefined : branch);
  }
  return { costUsd: cost, landed, branch, notes };
}
