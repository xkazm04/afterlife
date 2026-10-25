// collectWith against a fake provider on a temp data dir: sinceRunId is the newest stored, runs are classified and
// appended once, a run in flight holds back the newer ones, and a provider failure is a probe, never a throw. Also
// deployMarkers over the real Grinex run 898 timeline.
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { CiRun, ProjectConfig } from '@/schemas/vitals';
import type { CiProvider } from '@/server/providers/types';
import { ProviderError, probeResult } from '@/server/providers/probeResult';
import { mapTimeline } from '@/server/providers/azure/map';
import tl898 from '@/server/providers/azure/__fixtures__/timeline-898.json';
import { deployMarkers } from '../deploys';
import { readCiRuns } from '../store';
import { HOLD_MAX_MS, collectWith } from './collect';

const NOW = Date.parse('2026-10-25T10:00:00Z');
const cfg = { slug: 'grinex', ci: { provider: 'azure-pipelines', pipelines: [{ id: '2', name: 'Grinex Portal' }], variants: [{ id: 'master-full', pipelineId: '2', match: { branch: 'master' } }] } } as unknown as ProjectConfig;
const run = (id: number, o: Partial<CiRun> = {}): CiRun => ({
  key: `azure-pipelines:${id}`, provider: 'azure-pipelines', pipelineId: '2', pipelineName: 'Grinex Portal', runId: String(id), branch: 'master',
  reason: 'individualCI', sha: `sha${id}`, result: 'succeeded', startedAt: '2026-10-25T08:00:00.000Z', stages: [], fetchedAt: '2026-10-25T10:00:00.000Z', ...o,
});

function fake(batches: CiRun[][] | Error): CiProvider & { asked: (string | undefined)[] } {
  const asked: (string | undefined)[] = [];
  let i = 0;
  return {
    kind: 'azure-pipelines', asked,
    probe: async () => { throw new Error('unused'); },
    listRuns: async (_c, opts) => {
      asked.push(opts?.sinceRunId);
      if (batches instanceof Error) throw batches;
      const all = batches[Math.min(i++, batches.length - 1)] ?? [];
      return all.filter((r) => opts?.sinceRunId === undefined || Number(r.runId) > Number(opts.sinceRunId));
    },
  };
}

let dir = '';
const prev = process.env.BELAY_DATA_DIR;
beforeEach(() => { dir = mkdtempSync(join(tmpdir(), 'belay-collect-')); process.env.BELAY_DATA_DIR = dir; });
afterEach(() => {
  if (prev === undefined) delete process.env.BELAY_DATA_DIR;
  else process.env.BELAY_DATA_DIR = prev;
  rmSync(dir, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
});

describe('collectWith', () => {
  it('classifies and appends, then asks only for runs newer than the newest stored and adds 0 for the same runs', async () => {
    const p = fake([[run(905), run(904, { branch: 'feature/x' })]]);
    expect(await collectWith(cfg, p, NOW)).toEqual({ slug: 'grinex', ci: { added: 2, total: 2 }, probes: [] });
    expect(readCiRuns('grinex').map((r) => [r.runId, r.variant])).toEqual([['904', undefined], ['905', 'master-full']]);
    expect(readCiRuns('grinex')[0]).not.toHaveProperty('variant');
    expect(await collectWith(cfg, p, NOW)).toMatchObject({ ci: { added: 0, total: 2 } });
    expect(p.asked).toEqual([undefined, '905']);
  });

  it('a run in flight is not stored and holds back every newer finished run, so the next collect still sees it', async () => {
    const p = fake([
      [run(906), run(905), run(904, { result: 'running' }), run(903)],
      [run(906), run(905), run(904, { result: 'failed' }), run(903)],
    ]);
    expect((await collectWith(cfg, p, NOW)).ci).toEqual({ added: 1, total: 1 });
    expect((await collectWith(cfg, p, NOW)).ci).toEqual({ added: 3, total: 4 });
    expect(p.asked).toEqual([undefined, '903']);
    expect(readCiRuns('grinex').find((r) => r.runId === '904')?.result).toBe('failed');
  });

  it('a run stuck in flight for over a day stops holding the others back', async () => {
    const stuck = new Date(NOW - HOLD_MAX_MS - 1).toISOString();
    const p = fake([[run(906), run(904, { result: 'running', startedAt: stuck })]]);
    expect((await collectWith(cfg, p, NOW)).ci).toEqual({ added: 1, total: 1 });
  });

  it('a provider failure comes back as its fail probe and appends nothing', async () => {
    const probe = probeResult({ kind: 'az-devops-runs', args: { pipelineId: '2' } }, Date.now(), 'fail', 'AADSTS700082 - run `az login`');
    const r = await collectWith(cfg, fake(new ProviderError(probe)), NOW);
    expect(r).toEqual({ slug: 'grinex', ci: { added: 0, total: 0 }, probes: [probe] });
    const odd = await collectWith(cfg, fake(new Error('boom')), NOW);
    expect(odd.probes[0]).toMatchObject({ kind: 'az-devops-runs', status: 'fail', summary: 'boom' });
  });
});

describe('deployMarkers', () => {
  it('Grinex run 898: the succeeded deploy and swap stages, at their finish, with the run sha, oldest first', () => {
    const markers = deployMarkers([run(898, { sha: 'cf2374b9', stages: mapTimeline(tl898) })]);
    expect(markers.map((m) => [m.stage.replace(/\s+/g, ' '), m.at, m.sha])).toEqual([
      ['Deploy to Staging', '2026-10-14T08:32:31.513Z', 'cf2374b9'],
      ['Swap Staging Production (gated)', '2026-10-14T11:46:27.263Z', 'cf2374b9'],
    ]);
  });

  it('a failed or unfinished deploy stage is no marker', () => {
    const stages = [{ name: 'Deploy', result: 'failed' as const, finishedAt: '2026-10-14T08:00:00.000Z', jobs: [] }, { name: 'Swap', result: 'running' as const, jobs: [] }];
    expect(deployMarkers([run(1, { stages })])).toEqual([]);
  });
});
