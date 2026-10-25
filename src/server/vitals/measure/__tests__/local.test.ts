// localMeasure with the runner's T3 measurement faked at its seam (measureTech's signature): base and head measured
// with the project's own frontier metric and setup, and a 'local' Measurement appended. Refusals name what is missing.
import { describe, expect, it, vi } from 'vitest';
import type { ProjectConfig } from '@/schemas/vitals';
import { appendAdjustment, readAdjustments } from '../../store';
import { localMeasure, type MeasureTech } from '../local';
import { claim, tempData } from './fixture';

tempData();

const metric = { name: 'test wall', command: 'npx vitest run', parse: { kind: 'wall' as const }, direction: 'down' as const, threshold: 0.1 };
const project = (runner?: ProjectConfig['runner']): ProjectConfig => ({
  slug: 'grinex', name: 'Grinex Portal', root: '/work/grinex', onboardedAt: '2026-10-25T00:00:00Z', engine: { model: 'm', effort: 'low' }, host: { kind: 'azure-devops' },
  components: [], ci: { provider: 'azure-pipelines', pipelines: [], variants: [] }, cloud: { provider: 'none' }, probes: [], ...(runner ? { runner } : {}),
});
const local = claim({ id: 'shard', title: 'shard the vitest run', target: { kind: 'local-metric', metric: 'test wall' }, ref: { sha: 'cafe0906' } });

describe('localMeasure', () => {
  it('measures base and the change with the runner tech code and appends a local measurement', async () => {
    appendAdjustment('grinex', local);
    const measure = vi.fn<MeasureTech>(async (_repo, sha) => ({ series: [{ name: 'test wall', values: sha === 'origin/master' ? [200, 204] : [150, 152] }] }));
    const r = await localMeasure('grinex', 'shard', { measure, base: 'origin/master', project: project({ gates: ['npm test'], setup: ['npm ci'], frontier: { objective: 'faster tests', metrics: [metric] } }) });
    expect(measure).toHaveBeenCalledTimes(2);
    expect(measure.mock.calls[0]).toEqual([{ path: '/work/grinex', setup: ['npm ci'] }, 'origin/master', [metric], 2, expect.any(Number)]);
    expect(measure.mock.calls[1]?.[1]).toBe('cafe0906');
    expect(r).toMatchObject({ status: 'measured', measurement: { method: 'local', verdict: 'credited', base: { n: 2, median: 202 }, head: { n: 2, median: 151 } } });
    expect(readAdjustments('grinex').at(-1)).toMatchObject({ type: 'measurement', id: 'shard', method: 'local' });
  });

  it('refuses without a runner block, an unknown metric or a red setup, and appends nothing', async () => {
    appendAdjustment('grinex', local);
    const measure = vi.fn<MeasureTech>(async () => ({ series: [{ name: 'test wall', values: [] }], setupRed: 'tech setup: npm ci exited 1' }));
    expect(await localMeasure('grinex', 'shard', { measure, base: 'main', project: project() })).toMatchObject({ status: 'refused', reason: expect.stringMatching(/no runner block/) });
    const other = project({ gates: ['t'], frontier: { objective: 'o', metrics: [{ ...metric, name: 'bundle bytes' }] } });
    expect(await localMeasure('grinex', 'shard', { measure, base: 'main', project: other })).toMatchObject({ reason: expect.stringMatching(/not one of grinex's frontier metrics \(bundle bytes\)/) });
    expect(measure).not.toHaveBeenCalled();
    const red = await localMeasure('grinex', 'shard', { measure, base: 'main', project: project({ gates: ['t'], frontier: { objective: 'o', metrics: [metric] } }) });
    expect(red).toMatchObject({ status: 'refused', reason: expect.stringMatching(/setup was red/) });
    expect(readAdjustments('grinex').some((l) => l.type === 'measurement')).toBe(false);
  });
});
