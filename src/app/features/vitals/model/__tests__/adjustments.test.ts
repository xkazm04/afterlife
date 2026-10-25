import { describe, expect, it } from 'vitest';
import type { Measurement } from '@/schemas/vitals';
import { ADJUSTMENTS } from '../../data/__fixtures__/grinex';
import { adjustmentRows, measuredPct, remeasureOf, stateOf, targetWords } from '../adjustments';

const rows = adjustmentRows(ADJUSTMENTS);
const byId = (id: string) => rows.find((r) => r.claim.id === id)!;
const m = (verdict: Measurement['verdict'], n: number): Measurement => ({
  type: 'measurement', id: 'x', at: '2026-01-01T00:00:00Z', method: 'passive', base: { n, median: 10, spread: 0 }, head: { n, median: 9, spread: 0 }, verdict, tolerance: 0.05, reason: 'r',
});

describe('adjustmentRows: claims joined with measurements by id', () => {
  it('one row per claim, newest first', () => {
    expect(rows.map((r) => r.claim.id)).toEqual(['adj-4', 'adj-5', 'adj-3', 'adj-2', 'adj-1']);
  });
  it('the latest measurement decides, not the first', () => {
    expect(byId('adj-1')).toMatchObject({ state: 'credited', measurements: 2, measurement: { verdict: 'credited', at: '2026-10-24T10:00:00.000Z' } });
  });
  it('no measurement: proposed, and no measurement key', () => {
    expect(byId('adj-4').state).toBe('proposed');
    expect(byId('adj-4')).not.toHaveProperty('measurement');
  });
  it('inconclusive with a side under 3 is still measuring; at 3 or more it is inconclusive', () => {
    expect(byId('adj-3').state).toBe('measuring');
    expect(byId('adj-5').state).toBe('inconclusive');
    expect(stateOf(m('inconclusive', 2))).toBe('measuring');
    expect(stateOf(m('inconclusive', 3))).toBe('inconclusive');
  });
  it('not-earned and credited come straight from the verdict', () => {
    expect(byId('adj-2').state).toBe('not-earned');
    expect(stateOf(m('credited', 3))).toBe('credited');
  });
  it('the agent figure stays on the claim and never changes the state', () => {
    const withBigClaim = ADJUSTMENTS.map((l) => (l.type === 'claim' && l.id === 'adj-2' ? { ...l, agentValue: 1 } : l));
    expect(adjustmentRows(withBigClaim).find((r) => r.claim.id === 'adj-2')).toMatchObject({ state: 'not-earned', claim: { agentValue: 1 } });
  });
  it('a measurement with no stored claim is dropped', () => {
    expect(adjustmentRows([{ ...m('credited', 3), id: 'orphan' }])).toEqual([]);
  });
});

describe('words', () => {
  it('targetWords names the kind, what and where', () => {
    expect(targetWords({ kind: 'ci-stage', variant: 'master-full', stage: 'Run Tests' })).toBe('ci-stage Run Tests on master-full');
    expect(targetWords({ kind: 'prod-signal', signal: 'p95-ms' })).toBe('prod-signal p95-ms');
  });
  it('measuredPct is head against base; a zero base has none', () => {
    expect(measuredPct(m('credited', 3))).toBeCloseTo(-10);
    expect(measuredPct({ ...m('credited', 3), base: { n: 3, median: 0, spread: 0 } })).toBeUndefined();
  });
});

describe('remeasureOf', () => {
  const ci = { provider: 'azure-pipelines' as const, pipelines: [], variants: [{ id: 'master-full', pipelineId: '2', match: { branch: 'master' } }] };
  const claim = byId('adj-1').claim;
  it('a CI claim: passive, and the queue on its variant pipeline and branch (Azure Pipelines only)', () => {
    expect(remeasureOf(claim, { ci })).toEqual({ passive: true, queue: { pipelineId: '2', branch: 'belay/split-tests' } });
    expect(remeasureOf(claim, { ci: { ...ci, provider: 'gitlab-ci' } })).toEqual({ passive: true });
  });
  it('a local metric only when it is one of the runner frontier metrics; a prod signal has none', () => {
    const local = { ...claim, target: { kind: 'local-metric' as const, metric: 'test wall' } };
    const metric = { name: 'test wall', command: 'npm test', parse: { kind: 'wall' as const }, direction: 'down' as const, threshold: 0.1 };
    expect(remeasureOf(local, { ci, runner: { gates: ['t'], frontier: { objective: 'o', metrics: [metric] } } })).toEqual({ local: true });
    expect(remeasureOf(local, { ci })).toBeUndefined();
    expect(remeasureOf(byId('adj-3').claim, { ci })).toBeUndefined();
  });
});
