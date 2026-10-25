// Ten master-full runs of a Grinex-shaped pipeline: five before the change (Run Tests ~44 min) and five from it (~38
// min), plus a feature-branch run and a failed one that times nothing. A temp BELAY_DATA_DIR per test.
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach } from 'vitest';
import type { AdjustmentClaim, CiResult, CiRun } from '@/schemas/vitals';

const T0 = Date.parse('2026-10-20T08:00:00.000Z');
const iso = (ms: number) => new Date(T0 + ms).toISOString();

export function run(id: number, o: { tests: number; sha?: string; branch?: string; variant?: string; result?: CiResult; at?: number }): CiRun {
  const start = (o.at ?? id) * 3_600_000;
  const testsEnd = start + 31 * 60_000 + o.tests * 60_000;
  const result = o.result ?? 'succeeded';
  return {
    key: `azure-pipelines:${id}`, provider: 'azure-pipelines', pipelineId: '2', pipelineName: 'Grinex Portal', runId: String(id), branch: o.branch ?? 'master',
    reason: 'individualCI', sha: o.sha ?? `aaaa${String(id).padStart(4, '0')}`, result, startedAt: iso(start), finishedAt: iso(testsEnd + 60_000),
    ...(o.variant === '' ? {} : { variant: o.variant ?? 'master-full' }),
    stages: [
      { name: 'Build', result: 'succeeded', startedAt: iso(start), finishedAt: iso(start + 31 * 60_000), jobs: [] },
      { name: 'Run Tests', result, startedAt: iso(start + 31 * 60_000), finishedAt: iso(testsEnd), jobs: [] },
    ],
    fetchedAt: iso(48 * 3_600_000),
  };
}

const BEFORE = [44, 44.5, 43.8, 44.2, 44.1];
const AFTER = [38.2, 38.5, 38, 38.4, 38.1];

/** 901..905 before, 906..910 from the change (sha cafe0906 merged at 906). */
export const tenRuns = (): CiRun[] => [
  ...BEFORE.map((t, i) => run(901 + i, { tests: t })),
  ...AFTER.map((t, i) => run(906 + i, { tests: t, ...(i === 0 ? { sha: 'cafe0906' } : {}) })),
];

export const claim = (o: Partial<AdjustmentClaim> = {}): AdjustmentClaim => ({
  type: 'claim', id: '01JC0000000000000000000000', at: '2026-10-20T07:00:00.000Z', by: 'agent', title: 'cache the npm install key on package-lock',
  target: { kind: 'ci-stage', variant: 'master-full', stage: 'Run Tests' }, direction: 'down', expectedPct: 20, ref: { branch: 'feature/cache-key', sha: 'cafe0906' },
  agentValue: 12, ...o,
});

export function tempData(): void {
  let dir = '';
  const prev = process.env.BELAY_DATA_DIR;
  beforeEach(() => { dir = mkdtempSync(join(tmpdir(), 'belay-measure-')); process.env.BELAY_DATA_DIR = dir; });
  afterEach(() => {
    if (prev === undefined) delete process.env.BELAY_DATA_DIR;
    else process.env.BELAY_DATA_DIR = prev;
    rmSync(dir, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
  });
}
