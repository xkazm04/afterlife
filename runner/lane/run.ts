// One lane, start to end: a worktree on belay/wave-<n>-<lane>, one claude call, the caps, then on DONE a read-only
// review and at most one repair turn (review.ts), then the gates and - only on green - one commit
// `belay(wave-<n>): <title>` cherry-picked onto the wave branch (land.ts). Every way out maps to a LaneOutcome; a
// red gate can never reach the commit line. The lane worktree and its branch are always removed, so a lane leaves
// nothing behind but (maybe) a commit on the wave branch - or, when it changed something and did not land, a patch
// next to the run file.
import { callClaude } from '../agent/spawn';
import { addWorktree, removeWorktree, worktreeDir } from '../git/worktree';
import type { LaneOutcome } from '../../src/schemas/run';
import type { Log } from '../wave/events';
import { lanePrompt, type PlanItem } from '../wave/plan';
import { armedReason, verifyAndLand } from './land';
import { saveGateLog, savePatch } from './patch';
import { readClaim, reviewAndRepair } from './review';
import { failureLines, redReason, runGates } from './verify';

export { readClaim } from './review';
export { commitBody } from './land';

export interface LaneCtx {
  repoPath: string;
  gates: string[];
  /** FleetRepo.setup: run in the fresh lane worktree before claude starts; a red setup fails the lane. */
  setup: string[];
  /** Bash prefixes the lane's claude may run (permissions.ts bashPrefixes over setup, gates and laneTools). */
  bash: string[];
  /** FleetRepo.diffCheck: whitespace slips in the lane's change fail it before the gates run. */
  diffCheck?: boolean;
  baseSha: string;
  wave: number;
  /** The wave branch's own worktree: landed commits are cherry-picked here. */
  waveDir: string;
  model: string;
  laneCapUsd: number;
  timeoutMs: number;
  lanePromptText: string;
  /** review.md and repair.md as run: the review and repair turns' briefs. */
  reviewPromptText: string;
  repairPromptText: string;
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

/** A frontier lane: its brief replaces the plan item's prompt, and lane.start says it is one. */
export interface FrontierBrief {
  prompt: string;
}

export async function runLane(ctx: LaneCtx, item: PlanItem, frontier?: FrontierBrief): Promise<LaneResult> {
  const { log, wave } = ctx;
  const t0 = Date.now();
  const branch = `belay/wave-${wave}-${item.lane}`;
  // One fixed path for every lane (they run one at a time): cargo hashes a workspace crate's path into its build,
  // so a path per lane made a shared CARGO_TARGET_DIR grow by a whole workspace build per lane.
  const dir = worktreeDir(ctx.repoPath, 'afterlife-wave-lane');
  let costUsd = 0;
  let outcome: LaneOutcome = 'failed';
  let parkReason: string | undefined;
  /** The lane's DONE line: what it changed and the follow-ups it saw, read back by the next wave's planner. */
  let done: string | undefined;
  let patch: string | undefined;
  let flaky: string[] | undefined;
  let gateLog: string | undefined;
  let review: 'clean' | 'defects' | 'unread' | undefined;
  let restored: string[] = [];
  let failures: string[] = [];
  let text = '';
  const commits: string[] = [];
  log({ kind: 'lane.start', lane: item.lane, title: item.title, ...(frontier ? { frontier: true as const } : {}) });
  try {
    await addWorktree(ctx.repoPath, dir, ctx.baseSha, branch);
    const ready = await runGates(ctx.setup, dir, ctx.timeoutMs);
    if (!ready.ok) throw new LaneStop(redReason('setup', ready));
    const prompt = frontier?.prompt ?? lanePrompt(ctx.lanePromptText, item, ctx.laneCapUsd, { gates: ctx.gates, commands: ctx.bash });
    const a = await callClaude({ prompt, cwd: dir, model: ctx.model, timeoutMs: ctx.timeoutMs, permissions: { step: 'lane', bash: ctx.bash } });
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
    } else if ((parkReason = (await armedReason(dir, ctx.baseSha)) ?? undefined)) {
      // Before any later claude call: the review and repair turns would load the lane's own .claude settings.
      outcome = 'parked';
    } else {
      const prompts = { review: ctx.reviewPromptText, repair: ctx.repairPromptText, lane: ctx.lanePromptText };
      const rv = await reviewAndRepair({ dir, baseSha: ctx.baseSha, item, gates: ctx.gates, bash: ctx.bash, model: ctx.model, timeoutMs: ctx.timeoutMs, laneCapUsd: ctx.laneCapUsd, spentUsd: costUsd, prompts, lanePrompt: prompt, sessionId: a.sessionId, log });
      costUsd += rv.costUsd;
      review = rv.review;
      restored = rv.restored;
      done = (rv.done ?? claim.rest).slice(0, 400);
      if (rv.stop) {
        outcome = rv.stop.outcome;
        parkReason = rv.stop.parkReason;
      } else if (costUsd > ctx.laneCapUsd) {
        outcome = 'budget';
        parkReason = `lane cost $${costUsd.toFixed(2)} passed its $${ctx.laneCapUsd} cap after its review and repair`;
      } else {
        const landed = await verifyAndLand(ctx, dir, item, rv.done ?? claim.rest, a.model ?? ctx.model);
        outcome = landed.outcome;
        parkReason = landed.parkReason;
        flaky = landed.flaky;
        gateLog = saveGateLog(ctx.runsDir, { repo: ctx.repo, wave, what: item.lane }, landed.output);
        if (outcome !== 'landed') failures = failureLines(landed.output);
        if (landed.commit) commits.push(landed.commit);
      }
    }
  } catch (e) {
    parkReason = e instanceof LaneStop ? e.message : e instanceof Error ? e.message.slice(0, 300) : String(e);
  } finally {
    if (outcome !== 'landed') patch = await savePatch(dir, ctx.baseSha, { runsDir: ctx.runsDir, repo: ctx.repo, wave, lane: item.lane });
    await removeWorktree(ctx.repoPath, dir, branch);
  }
  const extra = { ...(review ? { review } : {}), ...(restored.length ? { restored } : {}) };
  log({ kind: 'lane.end', lane: item.lane, outcome, commits, ...(parkReason ? { parkReason } : {}), ...(done ? { done } : {}), ...(patch ? { patch } : {}), ...(flaky?.length ? { flaky } : {}), ...(gateLog ? { gateLog } : {}), ...extra, wallSec: Math.round((Date.now() - t0) / 1000) });
  return { outcome, costUsd, text, ...(parkReason ? { parkReason } : {}), ...(failures.length ? { failures } : {}) };
}
