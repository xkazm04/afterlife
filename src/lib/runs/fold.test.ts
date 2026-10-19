import { describe, expect, it } from 'vitest';
import { foldRuns, foldWave } from './fold';
import { WAVE_1, WAVE_2_RUNNING } from './fixture';
import { DASH, outcomeWords, tokens, usd, wall } from '@/app/features/runs/model/format';
import { parseRunLine } from './parse';
import type { RunEvent } from '@/schemas/run/run';

const events = (lines: string[]) => lines.map(parseRunLine).filter((e): e is RunEvent => e !== null);

describe('parseRunLine', () => {
  it('keeps the five kinds and drops everything else', () => {
    expect(events(WAVE_1).map((e) => e.kind)).toEqual(['wave.start', 'lane.start', 'lane.start', 'lane.usage', 'lane.end', 'lane.end', 'wave.end']);
    expect(WAVE_1.filter((l) => parseRunLine(l) === null)).toHaveLength(3);
    expect(parseRunLine('[]')).toBeNull();
    expect(parseRunLine('')).toBeNull();
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
