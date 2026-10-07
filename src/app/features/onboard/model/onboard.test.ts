import { describe, expect, it } from 'vitest';
import { DEMO } from '@/lib/demo';
import type { FleetProject } from '@/lib/demo/types';
import { nextAction, planBatch, resolve, runBatch, type ProjectRun } from './batch';
import { initialRuns, type OnboardData } from './build';
import { baseline, byGroup, funnel, stepOf, weakest, type Step } from './funnel';

const data: OnboardData = {
  org: 'acme-lab', host: 'gitlab.com', groups: DEMO.fleet.groups, projects: DEMO.fleet.projects, cycling: ['ledgerline'], asOf: '14:22',
};
const runs = initialRuns(data);
const steps = (r: Record<string, ProjectRun>): Record<string, Step> => Object.fromEntries(Object.entries(r).map(([k, v]) => [k, v.step]));
const byId = new Map(data.projects.map((p) => [p.id, p]));
const P = (id: string): FleetProject => byId.get(id)!;

describe('the estate funnel', () => {
  it('counts every project once, cumulatively', () => {
    expect(funnel(steps(runs))).toEqual({ discovered: 184, baselined: 175, paired: 166, watching: 155, cycling: 1 });
  });
  it('puts a stale feed at paired, never at watching', () => {
    const stale = data.projects.find((p) => p.state === 'stale')!;
    expect(stepOf(stale, new Set())).toBe('paired');
    expect(runs[stale.id]).toEqual({ step: 'paired', waiting: 'token', mr: null });
  });
  it('knows fx-rates waits for the merge of its bootstrap MR', () => {
    expect(runs['fx-rates']).toEqual({ step: 'baselined', waiting: 'merge', mr: '!2' });
    expect(nextAction(P('fx-rates'), runs['fx-rates']!, 'acme-lab')).toMatchObject({ kind: 'merge', who: 'you', writes: 0, to: 'paired' });
  });
  it('splits each group into the steps its projects sit at', () => {
    const groups = byGroup(data.projects, data.groups, steps(runs));
    expect(groups.reduce((n, g) => n + g.total, 0)).toBe(184);
    for (const g of groups) expect(Object.values(g.at).reduce((a, b) => a + b, 0)).toBe(g.total);
  });
  it('rates the estate baseline stage by stage and counts the unrated', () => {
    const rows = baseline(data.projects);
    expect(rows).toHaveLength(9);
    for (const r of rows) expect(r.rungs.reduce((a, b) => a + b, 0) + r.unknown).toBe(184);
    expect(weakest(rows)?.stage).toBeDefined();
  });
});

describe('the batch machine', () => {
  const batch = planBatch(data.projects, runs, 5, 'acme-lab');
  it('lists what only a person can do apart: 11 tokens and 1 merge', () => {
    expect(batch.yours).toHaveLength(12);
    expect(batch.yours).toContain('fx-rates');
  });
  it('runs every read (the 9 day-0 scans) whatever the batch size', () => {
    expect(batch.reads).toHaveLength(9);
    expect(planBatch(data.projects, runs, 0, 'acme-lab').reads).toHaveLength(9);
  });
  it('caps the writes at the batch size, bootstraps first', () => {
    expect(batch.writes).toHaveLength(5);
    expect(batch.writes.map((id) => runs[id]!.step).every((s) => s === 'baselined')).toBe(true);
    const big = planBatch(data.projects, runs, 20, 'acme-lab');
    expect(big.writes.slice(0, 8).every((id) => runs[id]!.step === 'baselined')).toBe(true);
    expect(runs[big.writes[8]!]!.step).toBe('watching');
  });
  it('a run lands the reads, opens one MR per write, and nothing moves until a person merges', () => {
    const { runs: after, nextMr } = runBatch(runs, batch, data.projects, 50, 'acme-lab');
    expect(funnel(steps(after)).baselined).toBe(184);
    const w = batch.writes[0]!;
    expect(after[w]).toMatchObject({ step: 'baselined', waiting: 'merge', mr: '!50' });
    expect(nextMr).toBe(55);
    const merged = resolve(after, w, P(w), 'acme-lab');
    expect(merged[w]).toEqual({ step: 'paired', waiting: null, mr: null });
  });
  it('a renewed token puts a stale project back to watching, and resolve ignores a project that waits for nothing', () => {
    const stale = data.projects.find((p) => p.state === 'stale')!;
    expect(resolve(runs, stale.id, stale, 'acme-lab')[stale.id]?.step).toBe('watching');
    expect(resolve(runs, 'ledgerline', P('ledgerline'), 'acme-lab')).toEqual(runs);
  });
  it('a watched project starts its first cycle through a policy MR, and a project in cycles has nothing next', () => {
    const watched = data.projects.find((p) => runs[p.id]?.step === 'watching')!;
    expect(nextAction(watched, runs[watched.id]!, 'acme-lab')).toMatchObject({ kind: 'cycle', writes: 1, to: 'cycling' });
    expect(nextAction(P('ledgerline'), runs['ledgerline']!, 'acme-lab')).toBeNull();
  });
});
