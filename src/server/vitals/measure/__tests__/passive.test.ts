// passiveMeasure over ten stored runs (five before the change, five from it): the expected verdict is appended once
// both sides have three; with fewer after it the answer is "waiting: k of N after" and nothing is appended.
import { describe, expect, it } from 'vitest';
import { appendAdjustment, appendCiRuns, readAdjustments } from '../../store';
import { passiveWith } from '../passive';
import { claim, run, tempData, tenRuns } from './fixture';

tempData();

describe('passiveMeasure', () => {
  it('compares the 5 runs before the merged sha with the first 5 from it, and credits the faster Run Tests', async () => {
    appendCiRuns('grinex', tenRuns());
    appendAdjustment('grinex', claim());
    const r = await passiveWith('grinex', claim().id, 5, { now: new Date('2026-10-22T00:00:00Z') });
    expect(r.status).toBe('measured');
    if (r.status !== 'measured') return;
    expect(r.measurement).toMatchObject({ type: 'measurement', id: claim().id, method: 'passive', verdict: 'credited', base: { n: 5, median: 44.1 }, head: { n: 5, median: 38.2 } });
    expect(readAdjustments('grinex').filter((l) => l.type === 'measurement')).toHaveLength(1);
  });

  it('finds the change by ancestry: the first run whose commit holds the sha, not only an exact match', async () => {
    appendCiRuns('grinex', tenRuns().map((r) => ({ ...r, sha: `bbbb${r.runId}` })));
    appendAdjustment('grinex', claim());
    const asked: string[] = [];
    const isAncestor = async (_a: string, sha: string) => (asked.push(sha), Number(sha.slice(4)) >= 906);
    const r = await passiveWith('grinex', claim().id, 5, { isAncestor });
    expect(r.status === 'measured' && r.measurement.verdict).toBe('credited');
    expect(asked.length).toBeLessThanOrEqual(4); // a binary search over 10 runs
  });

  it('waits while fewer than 3 runs after the change time the stage, and appends nothing', async () => {
    appendCiRuns('grinex', [...tenRuns().slice(0, 7), run(908, { tests: 0, result: 'failed' })]);
    appendAdjustment('grinex', claim());
    const r = await passiveWith('grinex', claim().id, 5);
    expect(r).toEqual({ status: 'waiting', after: 2, of: 5, message: 'waiting: 2 of 5 after' });
    expect(readAdjustments('grinex').some((l) => l.type === 'measurement')).toBe(false);
  });

  it('waits at 0 when no run has the change, and uses the first run on ref.branch when the claim has no sha', async () => {
    appendCiRuns('grinex', tenRuns().slice(0, 5));
    appendAdjustment('grinex', claim());
    expect(await passiveWith('grinex', claim().id, 5)).toMatchObject({ status: 'waiting', after: 0 });
    appendCiRuns('grinex', [run(906, { tests: 38, branch: 'feature/cache-key', variant: 'pr-feature', at: 905.5 }), ...tenRuns().slice(5).map((r) => ({ ...r, sha: 'other' }))]);
    appendAdjustment('grinex', claim({ id: 'nosha', ref: { branch: 'feature/cache-key' } }));
    const r = await passiveWith('grinex', 'nosha', 5);
    expect(r.status === 'measured' && r.measurement).toMatchObject({ verdict: 'credited', head: { n: 4 } });
  });

  it('classifies the stored runs by the project rules as they are now (a run stored under a renamed variant still counts)', async () => {
    appendCiRuns('grinex', tenRuns().map((r) => ({ ...r, variant: 'master-normal' })));
    appendAdjustment('grinex', claim());
    expect(await passiveWith('grinex', claim().id, 5)).toMatchObject({ status: 'waiting', after: 0 });
    const rules = [{ id: 'master-full', pipelineId: '2', match: { branch: 'master' } }];
    expect(await passiveWith('grinex', claim().id, 5, { rules })).toMatchObject({ status: 'measured', measurement: { verdict: 'credited' } });
  });

  it('refuses a claim that is not a CI one, or that is not stored', async () => {
    appendAdjustment('grinex', claim({ id: 'local', target: { kind: 'local-metric', metric: 'test wall' } }));
    expect((await passiveWith('grinex', 'local', 5)).status).toBe('refused');
    expect((await passiveWith('grinex', 'ghost', 5)).status).toBe('refused');
  });
});
