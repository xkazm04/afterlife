// The plan step: one read-only claude call in a detached worktree of the wave's base. With `--ideas`, the scans'
// shortcomings are gathered first (the checkout scan reads this very worktree) and shown in the prompt. A plan session
// that changed the worktree voids the plan. In a propose-only wave the items are the proposal: they are kept beside the
// run file (`<repo>/<wave>.proposed.jsonl`, one item per line) so a person, and the next wave's planner, can read them.
import fs from 'node:fs';
import path from 'node:path';
import { callClaude } from '../agent/spawn';
import { addWorktree, removeWorktree, worktreeDir } from '../git/worktree';
import { gatherIdeas, renderIdeas } from '../ideas';
import { git } from '../proc/proc';
import { jsonLines, parseEmptyAxes, parsePlan, planPrompt, uncoveredAxes, type PlanItem } from './plan';
import type { WaveCtx } from './wave';

export const proposedFile = (runsDir: string, repo: string, wave: number): string => path.join(runsDir, repo, `${wave}.proposed.jsonl`);

/** What a propose-only planner is told: its lines are the deliverable, and an earlier proposal is not new. */
export const PROPOSE_NOTE = '## Propose-only wave\nNothing you plan runs in this wave: your lines are the proposal a person reads. Keep the output contract exactly. Do not propose again an item an earlier wave already proposed (listed above); find the next one.\n';

export async function plan(c: WaveCtx, baseSha: string): Promise<{ items: PlanItem[]; costUsd: number }> {
  const dir = worktreeDir(c.repo.path, `belay-wave-${c.wave}-plan`);
  await addWorktree(c.repo.path, dir, baseSha);
  try {
    const ideas = c.opts.ideas?.length ? renderIdeas(gatherIdeas(c.opts.ideas, { checkout: dir, repoPath: c.repo.path })) : null;
    const extra = [c.opts.mode === 'propose' ? PROPOSE_NOTE : '', ideas?.text ?? ''].filter(Boolean).join('\n');
    const prompt = planPrompt(c.prompts.text.plan, c.repo, c.opts.lanes, c.history, c.baseRef, extra);
    const a = await callClaude({ prompt, cwd: dir, model: c.opts.model, timeoutMs: c.timeoutMs, permissions: { step: 'plan' } });
    const costUsd = a.costUsd ?? 0;
    if (a.usage) c.log({ kind: 'lane.usage', lane: 'plan', model: a.model ?? c.opts.model, ...a.usage, costUsd, ...(a.sessionId ? { sessionId: a.sessionId } : {}) });
    const dirty = (await git(dir, ['status', '--porcelain'])) !== '';
    const voided = a.timedOut ? 'timeout' : a.isError ? 'error' : dirty ? 'dirty' : undefined;
    const items = voided ? [] : parsePlan(a.text, c.opts.lanes);
    const empty = voided ? [] : parseEmptyAxes(a.text);
    // An axis with neither a lane nor an empty entry was never searched: recorded so reflect and the run file show it.
    const uncovered = voided ? [] : uncoveredAxes(items, empty);
    if (c.opts.mode === 'propose' && items.length) fs.writeFileSync(proposedFile(c.runsDir, c.repo.slug, c.wave), items.map((i) => `${JSON.stringify(i)}\n`).join(''));
    c.log({
      kind: 'wave.plan', raw: jsonLines(a.text), parsed: items.length, items: items.map((i) => i.lane),
      ...(empty.length ? { empty } : {}), ...(uncovered.length ? { uncovered } : {}), ...(voided ? { voided } : {}),
      // Every source asked for, with how many of its items the prompt showed (0: it found none, or none fit the cap).
      ...(ideas ? { ideas: (c.opts.ideas ?? []).map((source) => ({ source, count: ideas.counts.find((n) => n.source === source)?.count ?? 0 })) } : {}),
    });
    return { items, costUsd };
  } finally {
    await removeWorktree(c.repo.path, dir);
  }
}
