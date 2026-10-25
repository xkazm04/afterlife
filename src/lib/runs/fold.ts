// Pure folds: one wave's events -> a RunWave; the waves -> RunsData. Events are append-only, so a lane's last word wins
// (lane.end) and usage adds up. Nothing is invented: no usage event, no tokens or cost key.
import { LANE_OUTCOMES, type RunEvent } from '@/schemas/run/run';
import type { OutcomeCounts, RunLane, RunRepo, RunsData, RunTotals, RunWave } from './types';

export const emptyCounts = (): OutcomeCounts => Object.fromEntries(LANE_OUTCOMES.map((k) => [k, 0])) as OutcomeCounts;
const add = (a: number | undefined, b: number): number => (a ?? 0) + b;

export function foldLanes(events: readonly RunEvent[], promptVersion: string): RunLane[] {
  const lanes = new Map<string, RunLane>();
  const of = (lane: string): RunLane => {
    let l = lanes.get(lane);
    if (!l) lanes.set(lane, (l = { lane, promptVersion }));
    return l;
  };
  for (const e of events) {
    if (e.kind === 'lane.start') {
      const l = of(e.lane);
      l.title = e.title;
      l.promptVersion = e.promptVersion;
    } else if (e.kind === 'lane.usage') {
      const l = of(e.lane);
      l.tokens = add(l.tokens, e.inputTokens + e.outputTokens + e.cacheReadTokens + e.cacheWriteTokens);
      l.costUsd = add(l.costUsd, e.costUsd);
      // A review or repair call may run on another model: the lane's own session names the lane's model.
      if (!e.call || l.model === undefined) l.model = e.model;
    } else if (e.kind === 'lane.end') {
      const l = of(e.lane);
      l.outcome = e.outcome;
      l.commits = e.commits;
      l.wallSec = e.wallSec;
      if (e.parkReason !== undefined) l.parkReason = e.parkReason;
    }
  }
  return [...lanes.values()];
}

/** One wave's events, in file order -> its row. Null with no events. */
export function foldWave(events: readonly RunEvent[], hasProposals: boolean): RunWave | null {
  const first = events[0];
  if (!first) return null;
  const start = events.find((e) => e.kind === 'wave.start');
  const end = events.findLast((e) => e.kind === 'wave.end');
  const folded = foldLanes(events, start?.promptVersion ?? first.promptVersion);
  // The runner's own calls (plan, reflect) report usage under a lane id with no lane.start or lane.end: their
  // tokens and cost belong to the wave, but they are not lanes - never counted open, never a row.
  const lanes = folded.filter((l) => l.title !== undefined || l.outcome !== undefined);
  const counts = emptyCounts();
  for (const l of lanes) if (l.outcome) counts[l.outcome] += 1;
  const withTokens = folded.filter((l) => l.tokens !== undefined);
  const withCost = folded.filter((l) => l.costUsd !== undefined);
  const w: RunWave = {
    repo: first.repo,
    wave: first.wave,
    lanes,
    open: lanes.filter((l) => !l.outcome).length,
    counts,
    running: start !== undefined && end === undefined,
    hasProposals,
  };
  if (withTokens.length) w.tokens = withTokens.reduce((n, l) => n + (l.tokens ?? 0), 0);
  if (end?.kind === 'wave.end') {
    w.costUsd = end.costUsd;
    if (end.branchKept !== false) w.branch = end.branch;
    w.mergeable = end.mergeable;
    w.endedAt = end.ts;
  } else if (withCost.length) w.costUsd = withCost.reduce((n, l) => n + (l.costUsd ?? 0), 0);
  // A propose-only wave says so at its start, so a running one is already shown as proposing; its plan is the proposal.
  if ((start?.kind === 'wave.start' && start.mode === 'propose') || (end?.kind === 'wave.end' && end.proposeOnly)) {
    w.proposeOnly = true;
    const plan = events.findLast((e) => e.kind === 'wave.plan');
    if (plan?.kind === 'wave.plan') w.proposed = plan.items;
  }
  if (start?.kind === 'wave.start') {
    if (start.onto) w.onto = true;
    w.startedAt = start.ts;
    w.model = start.model;
    w.promptVersion = start.promptVersion;
  }
  return w;
}

export function totalsOf(waves: readonly RunWave[]): RunTotals {
  const counts = emptyCounts();
  let lanes = 0;
  let tokens: number | undefined;
  let costUsd: number | undefined;
  for (const w of waves) {
    lanes += w.lanes.length;
    for (const k of LANE_OUTCOMES) counts[k] += w.counts[k];
    if (w.tokens !== undefined) tokens = add(tokens, w.tokens);
    if (w.costUsd !== undefined) costUsd = add(costUsd, w.costUsd);
  }
  const ended = LANE_OUTCOMES.reduce((n, k) => n + counts[k], 0);
  const t: RunTotals = { waves: waves.length, lanes, counts };
  if (ended > 0) t.landedPct = counts.landed / ended;
  if (tokens !== undefined) t.tokens = tokens;
  if (costUsd !== undefined) t.costUsd = costUsd;
  return t;
}

/** Waves of every repo -> the screen's data: repos A-Z, each repo's waves newest first. */
export function foldRuns(waves: readonly RunWave[], skippedLines: number): RunsData {
  const byRepo = new Map<string, RunWave[]>();
  for (const w of waves) {
    const list = byRepo.get(w.repo);
    if (list) list.push(w);
    else byRepo.set(w.repo, [w]);
  }
  const repos: RunRepo[] = [...byRepo.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([repo, ws]) => {
      const sorted = [...ws].sort((a, b) => b.wave - a.wave);
      return { repo, waves: sorted, totals: totalsOf(sorted) };
    });
  return { repos, totals: totalsOf(waves), skippedLines };
}
