// queuedMeasure: exactly the queued run ids are the head, the variant's runs before them the base; it waits until a
// collect stored every queued run, appends one 'queued' Measurement per batch, and runs nothing itself.
import { describe, expect, it } from 'vitest';
import { appendAdjustment, appendCiRuns, readAdjustments } from '../../store';
import { appendQueued, measureQueuedAll, queuedMeasure, readQueued } from '../queued';
import { claim, run, tempData, tenRuns } from './fixture';

tempData();

const queued = (ids: number[]) => ids.map((id) => run(id, { tests: 38 + (id % 3) * 0.2, branch: 'feature/cache-key', variant: 'branch-manual' }));

describe('queuedMeasure', () => {
  it('waits for the queued runs, then compares exactly them against the runs before', () => {
    appendCiRuns('grinex', tenRuns().slice(0, 5));
    appendAdjustment('grinex', claim());
    appendQueued('grinex', { claimId: claim().id, runIds: ['920', '921', '922'], at: '2026-10-21T00:00:00.000Z' });
    expect(readQueued('grinex')).toHaveLength(1);
    expect(queuedMeasure('grinex', claim().id)).toMatchObject({ status: 'waiting', after: 0, of: 3 });
    appendCiRuns('grinex', [...queued([920, 921]), run(922, { tests: 30, result: 'running' })]);
    expect(queuedMeasure('grinex', claim().id)).toMatchObject({ status: 'waiting', after: 2, of: 3 });
  });

  it('appends one queued measurement per batch: a second call answers with it', () => {
    appendCiRuns('grinex', [...tenRuns().slice(0, 5), ...queued([920, 921, 922])]);
    appendAdjustment('grinex', claim());
    appendQueued('grinex', { claimId: claim().id, runIds: ['920', '921', '922'], at: '2026-10-21T00:00:00.000Z' });
    const r = measureQueuedAll('grinex', new Date('2026-10-22T00:00:00Z'));
    expect(r).toHaveLength(1);
    expect(r[0]).toMatchObject({ status: 'measured', measurement: { method: 'queued', verdict: 'credited', base: { n: 3, median: 44.1 }, head: { n: 3 } } });
    queuedMeasure('grinex', claim().id, new Date('2026-10-23T00:00:00Z'));
    expect(readAdjustments('grinex').filter((l) => l.type === 'measurement')).toHaveLength(1);
  });

  it('refuses a claim with nothing queued', () => {
    appendAdjustment('grinex', claim());
    expect(queuedMeasure('grinex', claim().id)).toEqual({ status: 'refused', reason: 'no runs were queued for this claim' });
  });
});
