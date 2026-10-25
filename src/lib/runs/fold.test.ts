import { describe, expect, it } from 'vitest';
import { emptyCounts, foldRuns, foldWave } from './fold';
import { WAVE_1, WAVE_2_RUNNING } from './fixture';
import { DASH, outcomeWords, tokens, usd, wall } from '@/app/features/runs/model/format';
import { parseRunLine } from './parse';
import { LANE_OUTCOMES, RUN_EVENT_KINDS, type RunEvent } from '@/schemas/run/run';

const events = (lines: string[]) => lines.map(parseRunLine).filter((e): e is RunEvent => e !== null);

describe('parseRunLine', () => {
  it('keeps the five kinds and drops everything else', () => {
    expect(events(WAVE_1).map((e) => e.kind)).toEqual(['wave.start', 'lane.start', 'lane.start', 'lane.usage', 'lane.end', 'lane.end', 'wave.end']);
    expect(WAVE_1.filter((l) => parseRunLine(l) === null)).toHaveLength(3);
    expect(parseRunLine('[]')).toBeNull();
    expect(parseRunLine('')).toBeNull();
  });

  it("reads every outcome the schema lists, and the fold counts each one", () => {
    const end = JSON.parse(WAVE_1[4]!) as Record<string, unknown>;
    for (const outcome of LANE_OUTCOMES) expect(parseRunLine(JSON.stringify({ ...end, outcome }))).toMatchObject({ outcome });
    expect(Object.keys(emptyCounts())).toEqual([...LANE_OUTCOMES]);
    expect(RUN_EVENT_KINDS).toContain('wave.tech');
  });
});

describe('wave.end branchKept', () => {
  it('a wave whose branch was deleted names no branch; one without the key (older files) keeps it', () => {
    const last = JSON.parse(WAVE_1[WAVE_1.length - 1]!) as Record<string, unknown>;
    const dropped = [...WAVE_1.slice(0, -1), JSON.stringify({ ...last, mergeable: false, branchKept: false, baseRed: 'base gate red: x (exit 1)' })];
    expect(foldWave(events(dropped), false)).not.toHaveProperty('branch');
    expect(foldWave(events(WAVE_1), false)?.branch).toBe('belay/wave-1');
  });
});

describe('wave.plan', () => {
  const plan = { v: 'belay.run/0', repo: 'alpha', promptVersion: 'abc123def456', kind: 'wave.plan', ts: '2026-10-17T10:00:00.5Z', wave: 1 };
  it('parses a plan summary and rejects a malformed one', () => {
    expect(parseRunLine(JSON.stringify({ ...plan, raw: 6, parsed: 1, items: ['a'] }))).toMatchObject({ kind: 'wave.plan', raw: 6, parsed: 1 });
    expect(parseRunLine(JSON.stringify({ ...plan, raw: 1, parsed: 0, items: [], voided: 'dirty' }))).not.toBeNull();
    expect(parseRunLine(JSON.stringify({ ...plan, raw: '6', parsed: 1, items: ['a'] }))).toBeNull();
    expect(parseRunLine(JSON.stringify({ ...plan, raw: 6, parsed: 1, items: [1] }))).toBeNull();
  });
  it('is not a lane: folding it in changes no row, count or cost', () => {
    const withPlan = [WAVE_1[0]!, JSON.stringify({ ...plan, raw: 3, parsed: 2, items: ['a', 'b'] }), ...WAVE_1.slice(1)];
    expect(foldWave(events(withPlan), true)).toEqual(foldWave(events(WAVE_1), true));
  });
});

describe('fields and kinds added later (review, repair, frontier, wave.tech)', () => {
  const base = { v: 'belay.run/0', repo: 'alpha', promptVersion: 'abc123def456', ts: '2026-10-17T10:04:00Z', wave: 1 };
  const tech = { ...base, kind: 'wave.tech', from: 'aaa', to: 'bbb', metrics: [{ name: 'build', unit: 's', before: 40, after: 30, gain: 0.25, threshold: 0.1, breakthrough: true, noisy: false }] };
  it('parses wave.tech and rejects one without metrics names', () => {
    expect(parseRunLine(JSON.stringify(tech))).toMatchObject({ kind: 'wave.tech', metrics: [{ name: 'build', breakthrough: true }] });
    expect(parseRunLine(JSON.stringify({ ...tech, metrics: [{ before: 1 }] }))).toBeNull();
    expect(parseRunLine(JSON.stringify({ ...tech, to: undefined }))).toBeNull();
  });
  it("a review or repair call's usage is the lane's cost, and wave.tech changes no row", () => {
    const usage = (call: string) => JSON.stringify({ ...base, kind: 'lane.usage', lane: 'a', model: 'haiku', inputTokens: 1, outputTokens: 1, cacheReadTokens: 0, cacheWriteTokens: 0, costUsd: 0.05, call });
    const plain = foldWave(events(WAVE_1), false)!;
    const w = foldWave(events([...WAVE_1.slice(0, -1), usage('review'), usage('repair'), JSON.stringify(tech), WAVE_1[WAVE_1.length - 1]!]), false)!;
    expect(w.lanes.map((l) => l.lane)).toEqual(plain.lanes.map((l) => l.lane));
    expect(w.lanes[0]?.costUsd).toBeCloseTo(0.35);
    expect(w.lanes[0]?.model).toBe('sonnet');
  });
});

describe('foldWave', () => {
  const w = foldWave(events(WAVE_1), true)!;
  it('folds lanes from their events', () => {
    expect(w.lanes.map((l) => l.lane)).toEqual(['a', 'b']);
    expect(w.lanes[0]).toMatchObject({ title: 'Fix the flaky retry', outcome: 'landed', commits: ['c1', 'c2'], wallSec: 180, tokens: 2000, costUsd: 0.25, model: 'sonnet', promptVersion: 'abc123def456' });
  });
  it('leaves absent usage absent, never 0', () => {
    const b = w.lanes[1]!;
    expect(b).toMatchObject({ outcome: 'parked', parkReason: 'needs a person to pick a version' });
    expect('tokens' in b).toBe(false);
    expect('costUsd' in b).toBe(false);
    expect('model' in b).toBe(false);
    expect(tokens(b.tokens)).toBe(DASH);
    expect(usd(b.costUsd)).toBe(DASH);
  });
  it('totals the wave and reads its end', () => {
    expect(w).toMatchObject({ repo: 'alpha', wave: 1, tokens: 2000, costUsd: 0.25, branch: 'belay/wave-1', mergeable: true, running: false, open: 0, hasProposals: true, model: 'sonnet' });
    expect(w.counts).toEqual({ landed: 1, parked: 1, failed: 0, budget: 0, timeout: 0 });
  });
  it('a wave with a start and no end is running, with no branch and no mergeable', () => {
    const r = foldWave(events(WAVE_2_RUNNING), false)!;
    expect(r).toMatchObject({ running: true, open: 1, costUsd: 0.01, hasProposals: false });
    expect('branch' in r).toBe(false);
    expect('mergeable' in r).toBe(false);
    expect('endedAt' in r).toBe(false);
  });
  it("the runner's own plan and reflect calls cost the wave but are no lanes", () => {
    const overhead = (lane: string, costUsd: number) =>
      JSON.stringify({ v: 'belay.run/0', repo: 'alpha', promptVersion: 'abc123def456', kind: 'lane.usage', ts: '2026-10-18T09:00:30Z', wave: 2, lane, model: 'sonnet', inputTokens: 1, outputTokens: 1, cacheReadTokens: 0, cacheWriteTokens: 0, costUsd });
    const r = foldWave(events([...WAVE_2_RUNNING, overhead('plan', 0.07), overhead('reflect', 0.05)]), false)!;
    expect(r.lanes.map((l) => l.lane)).toEqual(['a']);
    expect(r).toMatchObject({ open: 1, tokens: 19 });
    expect(r.costUsd).toBeCloseTo(0.13);
  });
  it('no events, no wave', () => expect(foldWave([], false)).toBeNull());
});

describe('foldRuns', () => {
  const data = foldRuns([foldWave(events(WAVE_1), false)!, foldWave(events(WAVE_2_RUNNING), false)!], 3);
  it('orders waves newest first and totals the repo and the fleet', () => {
    expect(data.repos.map((r) => [r.repo, r.waves.map((w) => w.wave)])).toEqual([['alpha', [2, 1]]]);
    expect(data.skippedLines).toBe(3);
    expect(data.totals).toMatchObject({ waves: 2, lanes: 3, tokens: 2015, landedPct: 0.5 });
    expect(data.totals.costUsd).toBeCloseTo(0.26);
  });
  it('has no percentage and no cost until something reports one', () => {
    const empty = foldRuns([], 0);
    expect(empty.totals).toEqual({ waves: 0, lanes: 0, counts: { landed: 0, parked: 0, failed: 0, budget: 0, timeout: 0 } });
  });
});

describe('words', () => {
  it('format figures', () => {
    expect(tokens(1234)).toBe('1.2k');
    expect(wall(75)).toBe('1m 15s');
    expect(outcomeWords({ landed: 2, parked: 0 }, 1)).toBe('2 landed, 1 open');
  });
});

describe('a propose-only wave', () => {
  const at = { v: 'belay.run/0', repo: 'alpha', promptVersion: 'abc123def456', wave: 3 };
  const propose = [
    { ...at, kind: 'wave.start', ts: '2026-10-25T10:00:00Z', base: 'main', lanes: 2, laneCapUsd: 3, waveCapUsd: 25, model: 'sonnet', branch: 'belay/wave-3', mode: 'propose' },
    { ...at, kind: 'lane.usage', ts: '2026-10-25T10:02:00Z', lane: 'plan', model: 'sonnet', inputTokens: 10, outputTokens: 5, cacheReadTokens: 0, cacheWriteTokens: 0, costUsd: 0.4 },
    { ...at, kind: 'wave.plan', ts: '2026-10-25T10:02:01Z', raw: 2, parsed: 2, items: ['split-tab', 'guard-total'], ideas: [{ source: 'lens-scan', count: 12 }] },
    { ...at, kind: 'wave.end', ts: '2026-10-25T10:02:02Z', branch: 'belay/wave-3', mergeable: false, costUsd: 0.4, branchKept: false, landed: 0, proposeOnly: true },
  ].map((o) => JSON.stringify(o));

  it('shows its planned items as proposed: no lane, nothing parked or failed, no branch to merge', () => {
    const w = foldWave(events(propose), false);
    expect(w).toMatchObject({ proposeOnly: true, proposed: ['split-tab', 'guard-total'], lanes: [], open: 0, mergeable: false, costUsd: 0.4, running: false });
    expect(w?.counts).toEqual(emptyCounts());
    expect(w).not.toHaveProperty('branch');
    expect(w).not.toHaveProperty('onto');
  });

  it('is proposing while it runs, and an execute wave carries neither key', () => {
    expect(foldWave(events(propose.slice(0, 1)), false)).toMatchObject({ proposeOnly: true, running: true });
    expect(foldWave(events(WAVE_1), false)).not.toHaveProperty('proposeOnly');
    const onto = JSON.stringify({ ...JSON.parse(WAVE_1[0]!), branch: 'work', onto: true });
    expect(foldWave(events([onto, ...WAVE_1.slice(1)]), false)).toMatchObject({ onto: true });
  });
});
