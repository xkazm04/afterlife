// The Azure mappers over real Grinex Portal output (scrubbed to the fields the code reads): run results, the
// Stage > Phase > Job nesting, and the skipped-stage omission.
import { describe, expect, it } from 'vitest';
import runs from './__fixtures__/runs.json';
import tl898 from './__fixtures__/timeline-898.json';
import tl904 from './__fixtures__/timeline-904.json';
import { mapRun, mapTimeline, recordResult, runResult } from './map';

const AT = '2026-10-25T09:30:00.000Z';
const run = (id: number) => mapRun(runs.find((r) => r.id === id), AT);
const mins = (s: { startedAt?: string; finishedAt?: string }) => Math.round((Date.parse(s.finishedAt ?? '') - Date.parse(s.startedAt ?? '')) / 60_000);

describe('azure run mapping', () => {
  it('maps every run result: failed, partiallySucceeded -> partial, canceled, inProgress -> running', () => {
    expect(run(904)?.result).toBe('failed');
    expect(run(898)?.result).toBe('partial');
    expect(run(913)?.result).toBe('canceled');
    expect(run(911)?.result).toBe('succeeded');
    expect(run(920)?.result).toBe('running');
    expect(runResult('notStarted', null)).toBe('running');
  });

  it('strips refs/heads/, keeps the reason verbatim, takes sha from sourceVersion and parameters from templateParameters', () => {
    const r = run(904);
    expect(r).toMatchObject({ key: 'azure-pipelines:904', pipelineId: '2', pipelineName: 'Grinex Portal', branch: 'master', reason: 'individualCI' });
    expect(r?.sha).toMatch(/^d0329085[0-9a-f]{32}$/);
    expect(r?.parameters).toEqual({ ciPool: 'selfhosted', dbShards: '4', fullSuite: 'False' });
    expect(r?.startedAt).toBe('2026-10-24T21:54:20.925Z');
  });

  it('omits what is absent: no parameters on a pipeline without them, no finishedAt on a running run', () => {
    expect(run(911)).not.toHaveProperty('parameters');
    expect(run(920)).not.toHaveProperty('finishedAt');
    expect(run(920)?.stages).toEqual([]);
  });
});

describe('azure timeline mapping', () => {
  it('run 904: the skipped stages are omitted, the rest in start order with their durations', () => {
    const stages = mapTimeline(tl904);
    expect(stages.map((s) => [s.name, s.result, mins(s)])).toEqual([
      ['Build Application', 'succeeded', 31],
      ['E2E Tests', 'failed', 16],
      ['Run Tests', 'failed', 144],
    ]);
  });

  it('nests jobs under their stage through the phase, in start order, and drops the job outside any stage', () => {
    const test = mapTimeline(tl904).find((s) => s.name === 'Run Tests');
    expect(test?.jobs.map((j) => j.name)).toEqual([
      'Frontend Tests (tsc + lint + vitest)',
      'Backend DB-backed tests (shard) 3',
      'Backend DB-backed tests (shard) 2',
      'Backend DB-backed tests (shard) 1',
      'Backend DB-backed tests (shard) 4',
      'Security Scan (pip-audit + bandit + SBOM)',
      'Backend Tests (pytest)',
    ]);
    expect(mapTimeline(tl904).flatMap((s) => s.jobs).some((j) => j.name === 'Finalize build')).toBe(false);
  });

  it('run 898: succeededWithIssues is partial, and the deploy stages are there', () => {
    const stages = mapTimeline(tl898);
    expect(stages).toHaveLength(6);
    expect(stages.find((s) => s.name === 'Validate Staging Health')?.result).toBe('partial');
    expect(stages.filter((s) => /swap|deploy/i.test(s.name)).map((s) => s.result)).toEqual(['succeeded', 'succeeded']);
  });

  it('record results: skipped is dropped, abandoned is canceled, an unfinished record runs', () => {
    expect(recordResult('completed', 'skipped')).toBeUndefined();
    expect(recordResult('completed', 'abandoned')).toBe('canceled');
    expect(recordResult('inProgress', null)).toBe('running');
    expect(mapTimeline(null)).toEqual([]);
  });
});
