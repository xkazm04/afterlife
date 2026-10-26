// Between a lane's DONE and its gates (Ascent paradigm P2, cycles personas-web-006 and -007): existing test files
// the lane changed beyond a mechanical edit are put back (integrity.ts), a FRESH read-only claude session reviews
// the change against the item and lane.md, and - only when it cites findings or a file was put back - the lane gets
// exactly ONE repair turn: its own session resumed (`--resume <sessionId>`, same worktree), or a fresh lane call
// with the item and the review when there is no session id. Both calls are metered as lane.usage with `call` set
// and count against the lane cap. A review that fails or cannot be read changes nothing: the gates judge as before.
import { createHash } from 'node:crypto';
import { callClaude } from '../agent/spawn';
import { git } from '../proc/proc';
import type { LaneOutcome } from '../../src/schemas/run';
import type { Log } from '../wave/events';
import type { PlanItem } from '../wave/plan';
import { changedAgainst, integrityForecast, restoreFromBase } from './integrity';
import { MAX_FINDINGS, capDiff, integrityFinding, parseReview, repairPrompt, reviewPrompt } from './reviewPrompt';

/** The review reads a diff of a few files: minutes, never the lane's budget. */
export const REVIEW_TIMEOUT_MS = 5 * 60_000;
/** The repair turn fixes cited lines in a session that already holds the work. */
export const REPAIR_TIMEOUT_MS = 6 * 60_000;

/** The lane's claim is its last DONE:/PARK: line; anything else is a failed lane. */
export function readClaim(text: string): { kind: 'DONE' | 'PARK'; rest: string } | null {
  const hits = [...text.matchAll(/^\s*(DONE|PARK):\s*(.*)$/gm)];
  const last = hits[hits.length - 1];
  return last ? { kind: last[1] as 'DONE' | 'PARK', rest: (last[2] ?? '').trim() } : null;
}

export interface ReviewCtx {
  dir: string;
  baseSha: string;
  item: PlanItem;
  gates: readonly string[];
  bash: string[];
  model: string;
  timeoutMs: number;
  laneCapUsd: number;
  /** What the lane has spent so far: the repair turn is not started past the cap. */
  spentUsd: number;
  prompts: { review: string; repair: string; lane: string };
  /** The prompt the lane ran with: a repair without a session id is a fresh call on it plus the review. */
  lanePrompt: string;
  sessionId: string | null;
  log: Log;
}

export interface ReviewResult {
  costUsd: number;
  review?: 'clean' | 'defects' | 'unread';
  restored: string[];
  /** The repair turn's DONE line, which supersedes the lane's first one. */
  done?: string;
  /** The lane ends here (a repair that parked, a review that wrote, the cap): no gate runs. */
  stop?: { outcome: LaneOutcome; parkReason: string };
}

/** Every byte of the lane's change against base: what proves the review session left the tree as it found it. */
async function fingerprint(dir: string, baseSha: string): Promise<string> {
  await git(dir, ['add', '-A']);
  const d = await git(dir, ['diff', '--cached', '--binary', '--no-ext-diff', '--no-textconv', baseSha]);
  return createHash('sha256').update(d).digest('hex');
}

const MARKER = /\n?<!-- afterlife:step=[^>]*-->\s*$/;

export async function reviewAndRepair(c: ReviewCtx): Promise<ReviewResult> {
  const lane = c.item.lane;
  let changed = await changedAgainst(c.dir, c.baseSha);
  if (changed.length === 0) return { costUsd: 0, restored: [] };
  const forecast = await integrityForecast(c.dir, c.baseSha, changed);
  const restored = forecast.map((f) => f.path);
  if (restored.length) {
    await restoreFromBase(c.dir, c.baseSha, restored);
    changed = await changedAgainst(c.dir, c.baseSha);
  }
  let costUsd = 0;
  let findings: ReturnType<typeof parseReview> = null;
  if (changed.length) {
    const diff = await git(c.dir, ['-c', 'core.quotepath=off', 'diff', '--cached', '--no-color', '--no-ext-diff', '--no-textconv', '--no-renames', c.baseSha]);
    const before = await fingerprint(c.dir, c.baseSha);
    const prompt = reviewPrompt({ base: c.prompts.review, item: c.item, laneRules: c.prompts.lane, gates: c.gates, view: { changed, diff: capDiff(diff) }, restored });
    const r = await callClaude({ prompt, cwd: c.dir, model: c.model, timeoutMs: Math.min(REVIEW_TIMEOUT_MS, c.timeoutMs), permissions: { step: 'review' } });
    costUsd += r.costUsd ?? 0;
    if (r.usage) c.log({ kind: 'lane.usage', lane, call: 'review', model: r.model ?? c.model, ...r.usage, costUsd: r.costUsd ?? 0, ...(r.sessionId ? { sessionId: r.sessionId } : {}) });
    // The review profile has no write tool; a changed tree means something else ran, and nothing in it is trusted.
    if ((await fingerprint(c.dir, c.baseSha)) !== before) return { costUsd, restored, review: 'unread', stop: { outcome: 'failed', parkReason: 'the review session changed the worktree' } };
    findings = r.timedOut || r.isError ? null : parseReview(r.text);
  }
  const all = [...restored.map(integrityFinding), ...(findings ?? [])].slice(0, MAX_FINDINGS);
  const review = !changed.length && !restored.length ? undefined : all.length ? 'defects' : findings == null ? 'unread' : 'clean';
  const base = { costUsd, restored, ...(review ? { review } : {}) } as ReviewResult;
  if (all.length === 0) return base;
  if (c.spentUsd + costUsd > c.laneCapUsd) return { ...base, stop: { outcome: 'budget', parkReason: `lane cost $${(c.spentUsd + costUsd).toFixed(2)} passed its $${c.laneCapUsd} cap before the repair turn` } };
  const fix = repairPrompt(c.prompts.repair, lane, all);
  // Resumed: the session already holds the item and the work. Fresh: the lane's own prompt (its marker cut), then the review.
  const prompt = c.sessionId ? fix : `${c.lanePrompt.replace(MARKER, '')}\n\n${fix}`;
  const r = await callClaude({ prompt, cwd: c.dir, model: c.model, timeoutMs: Math.min(REPAIR_TIMEOUT_MS, c.timeoutMs), permissions: { step: 'lane', bash: c.bash }, ...(c.sessionId ? { resume: c.sessionId } : {}) });
  base.costUsd += r.costUsd ?? 0;
  if (r.usage) c.log({ kind: 'lane.usage', lane, call: 'repair', model: r.model ?? c.model, ...r.usage, costUsd: r.costUsd ?? 0, ...(r.sessionId ? { sessionId: r.sessionId } : {}) });
  const claim = r.timedOut || r.isError ? null : readClaim(r.text);
  if (claim?.kind === 'PARK') return { ...base, stop: { outcome: 'parked', parkReason: `after review: ${claim.rest || 'parked without a reason'}` } };
  // The repair turn runs under the lane profile, so it can rewrite an existing test too: the same rule puts it back.
  const again = (await integrityForecast(c.dir, c.baseSha, await changedAgainst(c.dir, c.baseSha))).map((f) => f.path);
  if (again.length) {
    await restoreFromBase(c.dir, c.baseSha, again);
    base.restored = [...new Set([...restored, ...again])];
  }
  // No new DONE (a failed or killed repair): the lane's first claim stands, and the gates judge the tree as it is.
  return claim ? { ...base, done: claim.rest } : base;
}
