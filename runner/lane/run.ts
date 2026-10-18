// One lane, start to end: a worktree on belay/wave-<n>-<lane>, one claude call, the caps, the gates, and -
// only on green - one commit `belay(wave-<n>): <title>` cherry-picked onto the wave branch. Every way out
// maps to a LaneOutcome; a red gate can never reach the commit line. The lane worktree and its branch are
// always removed, so a lane leaves nothing behind but (maybe) a commit on the wave branch.
import { callClaude } from '../agent/spawn';
import { addWorktree, removeWorktree, worktreeDir } from '../git/worktree';
import { git, runProc } from '../proc/proc';
import type { LaneOutcome } from '../../src/schemas/run';
import type { Log } from '../wave/events';
import { lanePrompt, type PlanItem } from '../wave/plan';
import { runGates } from './verify';

export interface LaneCtx {
  repoPath: string;
  gates: string[];
  baseSha: string;
  wave: number;
  /** The wave branch's own worktree: landed commits are cherry-picked here. */
  waveDir: string;
  model: string;
  laneCapUsd: number;
  timeoutMs: number;
  lanePromptText: string;
  log: Log;
}

export interface LaneResult {
  outcome: LaneOutcome;
  costUsd: number;
}

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
  const dir = worktreeDir(ctx.repoPath, `belay-wave-${wave}-${item.lane}`);
  let costUsd = 0;
  let outcome: LaneOutcome = 'failed';
  let parkReason: string | undefined;
  const commits: string[] = [];
  log({ kind: 'lane.start', lane: item.lane, title: item.title });
  try {
    await addWorktree(ctx.repoPath, dir, ctx.baseSha, branch);
    const a = await callClaude({ prompt: lanePrompt(ctx.lanePromptText, item, ctx.laneCapUsd), cwd: dir, model: ctx.model, timeoutMs: ctx.timeoutMs });
    costUsd = a.costUsd ?? 0;
    if (a.usage) {
      log({ kind: 'lane.usage', lane: item.lane, model: a.model ?? ctx.model, ...a.usage, costUsd });
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
      const landed = await verifyAndLand(ctx, dir, item);
      outcome = landed.outcome;
      parkReason = landed.parkReason;
      if (landed.commit) commits.push(landed.commit);
    }
  } catch (e) {
    parkReason = e instanceof Error ? e.message.slice(0, 300) : String(e);
  } finally {
    await removeWorktree(ctx.repoPath, dir, branch);
  }
  log({ kind: 'lane.end', lane: item.lane, outcome, commits, ...(parkReason ? { parkReason } : {}), wallSec: Math.round((Date.now() - t0) / 1000) });
  return { outcome, costUsd };
}

async function verifyAndLand(ctx: LaneCtx, dir: string, item: PlanItem): Promise<{ outcome: LaneOutcome; parkReason?: string; commit?: string }> {
  const changed = (await git(dir, ['status', '--porcelain'])) !== '' || (await git(dir, ['rev-parse', 'HEAD'])) !== ctx.baseSha;
  if (!changed) return { outcome: 'parked', parkReason: 'DONE claimed but nothing changed' };
  const gates = await runGates(ctx.gates, dir, ctx.timeoutMs);
  if (!gates.ok) return { outcome: 'failed', parkReason: `gate red: ${gates.failed}` };
  await git(dir, ['reset', '--soft', ctx.baseSha]);
  await git(dir, ['add', '-A']);
  await git(dir, ['commit', '-m', `belay(wave-${ctx.wave}): ${item.title}`]);
  const sha = await git(dir, ['rev-parse', 'HEAD']);
  const pick = await runProc('git', ['-C', ctx.waveDir, 'cherry-pick', sha]);
  if (pick.code !== 0) {
    await runProc('git', ['-C', ctx.waveDir, 'cherry-pick', '--abort']);
    return { outcome: 'parked', parkReason: 'cherry-pick onto the wave branch conflicted' };
  }
  return { outcome: 'landed', commit: await git(ctx.waveDir, ['rev-parse', 'HEAD']) };
}
