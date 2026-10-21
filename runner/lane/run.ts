// One lane, start to end: a worktree on belay/wave-<n>-<lane>, one claude call, the caps, the gates, and -
// only on green - one commit `belay(wave-<n>): <title>` cherry-picked onto the wave branch. Every way out
// maps to a LaneOutcome; a red gate can never reach the commit line. The lane worktree and its branch are
// always removed, so a lane leaves nothing behind but (maybe) a commit on the wave branch - or, when it changed
// something and did not land, a patch next to the run file.
import { callClaude } from '../agent/spawn';
import { addWorktree, removeWorktree, worktreeDir } from '../git/worktree';
import { git, runProc } from '../proc/proc';
import type { LaneOutcome } from '../../src/schemas/run';
import type { Log } from '../wave/events';
import { lanePrompt, type PlanItem } from '../wave/plan';
import { saveGateLog, savePatch } from './patch';
import { GATE_RETRIES, failureLines, redReason, runGates } from './verify';

export interface LaneCtx {
  repoPath: string;
  gates: string[];
  /** FleetRepo.setup: run in the fresh lane worktree before claude starts; a red setup fails the lane. */
  setup: string[];
  /** Bash prefixes the lane's claude may run (permissions.ts bashPrefixes over setup, gates and laneTools). */
  bash: string[];
  baseSha: string;
  wave: number;
  /** The wave branch's own worktree: landed commits are cherry-picked here. */
  waveDir: string;
  model: string;
  laneCapUsd: number;
  timeoutMs: number;
  lanePromptText: string;
  log: Log;
  /** Where a lane that did not land saves its diff: <runsDir>/<repo>/<wave>.<lane>.patch. */
  runsDir: string;
  /** The fleet slug, for the patch's path. */
  repo: string;
}

export interface LaneResult {
  outcome: LaneOutcome;
  costUsd: number;
  /** The tail of the lane's final message (at most 1500 chars), for the reflect step. */
  text: string;
  /** Why it did not land (lane.end's parkReason), red gate output included. */
  parkReason?: string;
  /** A red gate's failure lines (failureLines over its whole output), for the reflect step. */
  failures?: string[];
}

/** A stop whose message is a complete park reason (a red setup with its output): kept whole, not cut to 300. */
class LaneStop extends Error {}


/** The lane's claim is its last DONE:/PARK: line; anything else is a failed lane. */
export function readClaim(text: string): { kind: 'DONE' | 'PARK'; rest: string } | null {
  const hits = [...text.matchAll(/^\s*(DONE|PARK):\s*(.*)$/gm)];
  const last = hits[hits.length - 1];
  return last ? { kind: last[1] as 'DONE' | 'PARK', rest: (last[2] ?? '').trim() } : null;
}

export async function runLane(ctx: LaneCtx, item: PlanItem): Promise<LaneResult> {
  const { log, wave } = ctx;
  const t0 = Date.now();
  const branch = `belay/wave-${wave}-${item.lane}`;
  // One fixed path for every lane (they run one at a time): cargo hashes a workspace crate's path into its build,
  // so a path per lane made a shared CARGO_TARGET_DIR grow by a whole workspace build per lane.
  const dir = worktreeDir(ctx.repoPath, 'belay-wave-lane');
  let costUsd = 0;
  let outcome: LaneOutcome = 'failed';
  let parkReason: string | undefined;
  let patch: string | undefined;
  let flaky: string[] | undefined;
  let gateLog: string | undefined;
  let failures: string[] = [];
  let text = '';
  const commits: string[] = [];
  log({ kind: 'lane.start', lane: item.lane, title: item.title });
  try {
    await addWorktree(ctx.repoPath, dir, ctx.baseSha, branch);
    const ready = await runGates(ctx.setup, dir, ctx.timeoutMs);
    if (!ready.ok) throw new LaneStop(redReason('setup', ready));
    const a = await callClaude({ prompt: lanePrompt(ctx.lanePromptText, item, ctx.laneCapUsd, { gates: ctx.gates, commands: ctx.bash }), cwd: dir, model: ctx.model, timeoutMs: ctx.timeoutMs, permissions: { step: 'lane', bash: ctx.bash } });
    costUsd = a.costUsd ?? 0;
    text = a.text.slice(-1500);
    if (a.usage) {
      log({ kind: 'lane.usage', lane: item.lane, model: a.model ?? ctx.model, ...a.usage, costUsd, ...(a.sessionId ? { sessionId: a.sessionId } : {}) });
    }
    const claim = readClaim(a.text);
    if (a.timedOut) {
      outcome = 'timeout';
      parkReason = `killed after ${Math.round(ctx.timeoutMs / 1000)}s`;
    } else if (costUsd > ctx.laneCapUsd) {
      outcome = 'budget';
      parkReason = `lane cost $${costUsd.toFixed(2)} passed its $${ctx.laneCapUsd} cap`;
    } else if (a.isError || !claim) {
      parkReason = a.isError ? 'claude reported an error' : 'no DONE/PARK line in the final message';
    } else if (claim.kind === 'PARK') {
      outcome = 'parked';
      parkReason = claim.rest || 'parked without a reason';
    } else {
      const landed = await verifyAndLand(ctx, dir, item, claim.rest);
      outcome = landed.outcome;
      parkReason = landed.parkReason;
      flaky = landed.flaky;
      gateLog = saveGateLog(ctx.runsDir, { repo: ctx.repo, wave, what: item.lane }, landed.output);
      failures = failureLines(landed.output);
      if (landed.commit) commits.push(landed.commit);
    }
  } catch (e) {
    parkReason = e instanceof LaneStop ? e.message : e instanceof Error ? e.message.slice(0, 300) : String(e);
  } finally {
    if (outcome !== 'landed') patch = await savePatch(dir, ctx.baseSha, { runsDir: ctx.runsDir, repo: ctx.repo, wave, lane: item.lane });
    await removeWorktree(ctx.repoPath, dir, branch);
  }
  log({ kind: 'lane.end', lane: item.lane, outcome, commits, ...(parkReason ? { parkReason } : {}), ...(patch ? { patch } : {}), ...(flaky?.length ? { flaky } : {}), ...(gateLog ? { gateLog } : {}), wallSec: Math.round((Date.now() - t0) / 1000) });
  return { outcome, costUsd, text, ...(parkReason ? { parkReason } : {}), ...(failures.length ? { failures } : {}) };
}

/**
 * Paths that configure the agent or the hooks git runs: claude's project settings and MCP servers, and the
 * usual in-repo hook dirs. The lane prompt already forbids these; a landed one would arm every later wave
 * stacked on this branch (claude hooks run with the model key), so the runner enforces it.
 */
const ARMED_PATH = /^(\.claude\/|\.mcp\.json$|\.husky\/|\.githooks\/)/;

/** Files the lane changed against base (tracked and untracked), NUL-split so no name is quoted. */
async function changedFiles(dir: string, baseSha: string): Promise<string[]> {
  await git(dir, ['add', '-A']);
  return (await git(dir, ['diff', '--cached', '--name-only', '-z', baseSha])).split('\0').filter(Boolean);
}

/** The commit body: the item's evidence and the lane's own DONE claim, so the commit says why without the run file. */
export const commitBody = (item: PlanItem, done: string): string => [item.why && `Why: ${item.why}`, done && `Done: ${done}`, `Lane: ${item.lane}`].filter(Boolean).join('\n\n');

async function verifyAndLand(ctx: LaneCtx, dir: string, item: PlanItem, done: string): Promise<{ outcome: LaneOutcome; parkReason?: string; commit?: string; flaky?: string[]; output?: string }> {
  const changed = (await git(dir, ['status', '--porcelain'])) !== '' || (await git(dir, ['rev-parse', 'HEAD'])) !== ctx.baseSha;
  if (!changed) return { outcome: 'parked', parkReason: 'DONE claimed but nothing changed' };
  const armed = (await changedFiles(dir, ctx.baseSha)).filter((f) => ARMED_PATH.test(f));
  if (armed.length) return { outcome: 'parked', parkReason: `edits agent or hook config: ${armed.slice(0, 5).join(', ')}` };
  const gates = await runGates(ctx.gates, dir, ctx.timeoutMs, GATE_RETRIES);
  const flaky = gates.flaky?.length ? { flaky: gates.flaky } : {};
  if (!gates.ok) return { outcome: 'failed', parkReason: redReason('gate', gates), ...flaky, ...(gates.output ? { output: gates.output } : {}) };
  await git(dir, ['reset', '--soft', ctx.baseSha]);
  await git(dir, ['add', '-A']);
  await git(dir, ['commit', '-m', `belay(wave-${ctx.wave}): ${item.title}`, '-m', commitBody(item, done)]);
  const sha = await git(dir, ['rev-parse', 'HEAD']);
  const pick = await runProc('git', ['-C', ctx.waveDir, 'cherry-pick', sha]);
  if (pick.code !== 0) {
    await runProc('git', ['-C', ctx.waveDir, 'cherry-pick', '--abort']);
    return { outcome: 'parked', parkReason: 'cherry-pick onto the wave branch conflicted', ...flaky };
  }
  return { outcome: 'landed', commit: await git(ctx.waveDir, ['rev-parse', 'HEAD']), ...flaky };
}
