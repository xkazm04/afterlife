// The vitals store on a temp AFTERLIFE_DATA_DIR: idempotent by key (a re-append adds 0 and leaves no duplicate key),
// adjustments append as they come, unreadable lines are skipped and counted, and a read re-parses only on change.
import { appendFileSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { AdjustmentClaim, CiRun, ProdPoint } from '@/schemas/vitals';
import { appendAdjustment, appendCiRuns, appendProd, readAdjustments, readCiRuns, readProd, readVitals, vitalsDir } from '.';

const run = (id: number): CiRun => ({
  key: `azure-pipelines:${id}`, provider: 'azure-pipelines', pipelineId: '2', pipelineName: 'Grinex Portal', runId: String(id), branch: 'master',
  reason: 'individualCI', sha: 'd0329085', result: 'succeeded', startedAt: '2026-10-24T21:54:20.925Z', stages: [], fetchedAt: '2026-10-25T09:30:00.000Z',
});
const point = (h: number): ProdPoint => ({ key: `requests:2026-10-25T0${h}:00:00.000Z`, signal: 'requests', binStart: `2026-10-25T0${h}:00:00.000Z`, binMin: 60, value: 120 + h, n: 120 + h });

let dir = '';
const prev = process.env.AFTERLIFE_DATA_DIR;
beforeEach(() => { dir = mkdtempSync(join(tmpdir(), 'afterlife-vitals-')); process.env.AFTERLIFE_DATA_DIR = dir; });
afterEach(() => {
  if (prev === undefined) delete process.env.AFTERLIFE_DATA_DIR;
  else process.env.AFTERLIFE_DATA_DIR = prev;
  rmSync(dir, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
});

describe('vitals store', () => {
  it('re-appending the same runs adds 0, and the file holds no duplicate key', () => {
    expect(appendCiRuns('grinex', [run(898), run(904)])).toBe(2);
    expect(appendCiRuns('grinex', [run(898), run(904)])).toBe(0);
    expect(appendCiRuns('grinex', [run(904), run(911), run(911)])).toBe(1);
    const keys = readFileSync(join(vitalsDir('grinex'), 'ci-runs.jsonl'), 'utf8').trim().split('\n').map((l) => JSON.parse(l).key);
    expect(keys).toEqual(['azure-pipelines:898', 'azure-pipelines:904', 'azure-pipelines:911']);
    expect(new Set(keys).size).toBe(keys.length);
    expect(readCiRuns('grinex').map((r) => r.runId)).toEqual(['898', '904', '911']);
  });

  it('prod points are idempotent by key too; adjustments append every line', () => {
    expect(appendProd('grinex', [point(1), point(2)])).toBe(2);
    expect(appendProd('grinex', [point(2), point(3)])).toBe(1);
    expect(readProd('grinex')).toHaveLength(3);
    const claim: AdjustmentClaim = { type: 'claim', id: 'c1', at: '2026-10-25T09:00:00.000Z', by: 'agent', title: 'shard the DB tests', target: { kind: 'ci-stage', stage: 'Run Tests' }, direction: 'down', ref: {} };
    appendAdjustment('grinex', claim);
    appendAdjustment('grinex', claim);
    expect(readAdjustments('grinex')).toHaveLength(2);
  });

  it('a missing project reads as nothing; a line that is not a run is skipped and counted, and an append is seen', () => {
    expect(readCiRuns('nobody')).toEqual([]);
    appendCiRuns('grinex', [run(904)]);
    const file = join(vitalsDir('grinex'), 'ci-runs.jsonl');
    appendFileSync(file, 'not json\n{"key":"x"}\n');
    expect(readVitals('grinex', 'ci')).toMatchObject({ skipped: 2 });
    expect(readCiRuns('grinex')).toHaveLength(1);
    appendCiRuns('grinex', [run(905)]);
    expect(readCiRuns('grinex')).toHaveLength(2);
  });

  it('an unchanged file is served from the cache (the same array), a changed one is re-read', () => {
    appendCiRuns('grinex', [run(904)]);
    const a = readCiRuns('grinex');
    expect(readCiRuns('grinex')).toBe(a);
    appendCiRuns('grinex', [run(905)]);
    expect(readCiRuns('grinex')).not.toBe(a);
  });
});
