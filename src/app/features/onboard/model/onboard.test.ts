import { describe, expect, it } from 'vitest';
import { DEMO } from '@/lib/demo';
import type { FleetProject } from '@/lib/demo/types';
import { nextAction, planBatch, ratedMean, resolve, runBatch, type ProjectRun } from './batch';
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
  it('knows fx-rates waits for the merge of its bootstrap MR, and looks it up by branch (its number is not in the data)', () => {
    expect(runs['fx-rates']).toEqual({ step: 'baselined', waiting: 'merge', mr: null });
    expect(nextAction(P('fx-rates'), runs['fx-rates']!, 'acme-lab')).toMatchObject({
      kind: 'merge', who: 'you', writes: 0, to: 'paired', cmd: ['glab mr list -R acme-lab/risk/fx-rates --source-branch belay/bootstrap'],
    });
  });
  it('never offers a second bootstrap to a project whose setup is under way at an unrecorded step', () => {
    const inFlight = data.projects.filter((p) => p.state === 'setting-up' && !p.setupStep);
    expect(inFlight).toHaveLength(8);
    for (const p of inFlight) expect(nextAction(p, runs[p.id]!, 'acme-lab')?.kind).toBe('setup');
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
  // the server confirmed every write but the last: GitLab named an MR for the first, none for the rest (demo mode)
  const opened = Object.fromEntries(batch.writes.slice(0, 4).map((id, i) => [id, i === 0 ? { mr: '!50' } : { mr: null, branch: `belay/enroll-T6-${id}` }]));
  const after = { runs: runBatch(runs, batch, data.projects, 'acme-lab', opened) };
  it('lists what only a person can do apart: 11 tokens, 1 merge, 8 unfinished setups', () => {
    expect(batch.yours).toHaveLength(20);
    expect(batch.yours).toContain('fx-rates');
  });
  it('runs every read (the 9 day-0 scans) whatever the batch size', () => {
    expect(batch.reads).toHaveLength(9);
    expect(planBatch(data.projects, runs, 0, 'acme-lab').reads).toHaveLength(9);
  });
  it('caps the writes at the batch size; with no bootstrap due, first cycles go to the weakest rated first', () => {
    expect(batch.writes).toHaveLength(5);
    const means = batch.writes.map((id) => ratedMean(P(id))!);
    expect(means).toEqual([...means].sort((a, b) => a - b));
  });
  it('a run lands the reads, waits on the enroll MRs the server confirmed, and nothing moves until a person merges', () => {
    expect(funnel(steps(after.runs)).baselined).toBe(184);
    const w = batch.writes[0]!;
    expect(after.runs[w]).toMatchObject({ step: 'watching', waiting: 'merge', mr: '!50', mrRepo: 'acme-lab/belay-policy' });
    expect(nextAction(P(w), after.runs[w]!, 'acme-lab')?.cmd).toEqual(['glab mr view 50 -R acme-lab/belay-policy --web']);
    expect(resolve(after.runs, w, P(w), 'acme-lab')[w]).toMatchObject({ step: 'cycling', waiting: null });
    const unnamed = batch.writes[1]!;
    expect(nextAction(P(unnamed), after.runs[unnamed]!, 'acme-lab')).toMatchObject({
      label: 'Merge the enroll MR', cmd: [`glab mr list -R acme-lab/belay-policy --source-branch belay/enroll-T6-${unnamed}`],
    });
  });
  it('a write the server did not confirm does not move, and no MR number is made up', () => {
    const refused = batch.writes[4]!;
    expect(after.runs[refused]).toEqual(runs[refused]);
    for (const r of Object.values(after.runs)) if (r.mr) expect(r.mr).toBe('!50');
  });
  it('a write carries the server intent Setup sends, and spells no command of its own', () => {
    const fresh = data.projects.find((p) => runs[p.id]?.step === 'watching')!;
    expect(nextAction(fresh, { step: 'baselined', waiting: null, mr: null }, 'acme-lab')).toMatchObject({
      kind: 'bootstrap', writes: 1, cmd: [], intent: { kind: 'arm-track', project: fresh.id, track: 'T6' },
    });
    expect(nextAction(fresh, runs[fresh.id]!, 'acme-lab')).toMatchObject({
      kind: 'cycle', writes: 1, cmd: [], intent: { kind: 'enroll-track', project: fresh.id, track: 'T6' },
    });
  });
  it('bootstraps come first once scans land, best rated first, unrated last (unknown is never zero)', () => {
    const next = planBatch(data.projects, after.runs, 20, 'acme-lab');
    const steps2 = next.writes.map((id) => after.runs[id]!.step);
    expect(steps2.slice(0, 9).every((s) => s === 'baselined')).toBe(true);
    expect(steps2[9]).toBe('watching');
    expect(next.writes.slice(0, 9).every((id) => ratedMean(P(id)) == null)).toBe(true);
  });
  it('a group scopes reads and writes, never what only you can do', () => {
    const scoped = planBatch(data.projects, runs, 5, 'acme-lab', (p) => p.group === 'risk');
    expect(scoped.yours).toEqual(batch.yours);
    expect([...scoped.reads, ...scoped.writes].every((id) => P(id).group === 'risk')).toBe(true);
  });
  it('a renewed token puts a stale project back to watching, and resolve ignores a project that waits for nothing', () => {
    const stale = data.projects.find((p) => p.state === 'stale')!;
    expect(resolve(runs, stale.id, stale, 'acme-lab')[stale.id]?.step).toBe('watching');
    expect(resolve(runs, 'ledgerline', P('ledgerline'), 'acme-lab')).toEqual(runs);
  });
  it('no bare !N reaches a shell, and a project in cycles has no next action', () => {
    for (const [id, r] of Object.entries(after.runs)) {
      if (r.mr) expect(nextAction(P(id), r, 'acme-lab')!.cmd.join(' ')).not.toMatch(/mr view !/);
    }
    expect(nextAction(P('ledgerline'), runs['ledgerline']!, 'acme-lab')).toBeNull();
  });
});
