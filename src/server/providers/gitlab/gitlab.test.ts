// The GitLab CI provider over fixtures (no live project): stages from the jobs' `stage`, skipped and manual jobs
// omitted, an allowed failure as partial, a running pipeline without a jobs call, and a lapsed glab login as a `fail`.
import { describe, expect, it } from 'vitest';
import type { ProjectConfig } from '@/schemas/vitals';
import type { Exec } from '../types';
import { ProviderError } from '../probeResult';
import fx from './__fixtures__/pipelines.json';
import { gitlabCi } from '.';

const NOW = Date.parse('2026-10-25T10:00:00Z');
const cfg = { slug: 'ledger', host: { kind: 'gitlab', path: 'acme/ledgerline' }, ci: { provider: 'gitlab-ci', pipelines: [{ id: 'main', name: 'ledgerline' }], variants: [] } } as unknown as ProjectConfig;
const jobs = fx.jobs as Record<string, unknown[]>;

function fakeGlab(fail?: { code: number; stderr: string }) {
  const calls: string[][] = [];
  const exec: Exec = async (bin, args) => {
    calls.push([bin, ...args]);
    if (fail) return { code: fail.code, stdout: '', stderr: fail.stderr, ms: 1 };
    const m = /pipelines\/(\d+)\/jobs/.exec(args[1] ?? '');
    return { code: 0, stdout: JSON.stringify(m ? jobs[m[1] ?? ''] ?? [] : fx.pipelines), stderr: '', ms: 1 };
  };
  return { exec, calls };
}

describe('gitlab listRuns', () => {
  it('maps results and asks for jobs of finished pipelines only, through an url-encoded project path', async () => {
    const g = fakeGlab();
    const out = await gitlabCi(g.exec, () => NOW).listRuns(cfg);
    expect(g.calls[0]).toEqual(['glab', 'api', 'projects/acme%2Fledgerline/pipelines?per_page=50']);
    expect(out.map((r) => [r.runId, r.result])).toEqual([['70005', 'running'], ['70004', 'partial'], ['70003', 'succeeded'], ['70002', 'failed']]);
    expect(g.calls.some((c) => c[2]?.includes('70005/jobs'))).toBe(false);
    expect(g.calls.find((c) => c[2]?.includes('70004/jobs'))?.[2]).toBe('projects/acme%2Fledgerline/pipelines/70004/jobs?per_page=100');
  });

  it('groups jobs by stage: min start, max finish, in start order; reason = source; refs/heads/ stripped', async () => {
    const out = await gitlabCi(fakeGlab().exec, () => NOW).listRuns(cfg);
    const nightly = out.find((r) => r.runId === '70004');
    expect(nightly).toMatchObject({ key: 'gitlab-ci:70004', pipelineId: 'main', reason: 'schedule', branch: 'main', finishedAt: '2026-10-25T03:19:30.000Z' });
    expect(nightly?.stages.map((s) => [s.name, s.result, s.startedAt, s.finishedAt])).toEqual([
      ['build', 'succeeded', '2026-10-25T03:01:00.000Z', '2026-10-25T03:04:50.000Z'],
      ['test', 'partial', '2026-10-25T03:05:00.000Z', '2026-10-25T03:14:00.000Z'],
      ['deploy', 'succeeded', '2026-10-25T03:15:00.000Z', '2026-10-25T03:19:30.000Z'],
    ]);
    expect(nightly?.stages[1]?.jobs.map((j) => j.name)).toEqual(['sast', 'e2e']);
    expect(out.find((r) => r.runId === '70002')?.branch).toBe('feature/login');
  });

  it('omits a skipped job, a never-played manual job, and a stage left empty by them', async () => {
    const out = await gitlabCi(fakeGlab().exec, () => NOW).listRuns(cfg);
    expect(out.find((r) => r.runId === '70002')?.stages.map((s) => s.name)).toEqual(['build', 'test']);
    expect(out.find((r) => r.runId === '70003')?.stages.map((s) => s.name)).toEqual(['build', 'test']);
    expect(out.find((r) => r.runId === '70005')?.stages).toEqual([]);
  });

  it('honours sinceRunId and maxDays, and turns a failed call into a ProviderError', async () => {
    const out = await gitlabCi(fakeGlab().exec, () => NOW).listRuns(cfg, { sinceRunId: '70003', maxDays: 90 });
    expect(out.map((r) => r.runId)).toEqual(['70005', '70004']);
    const err = await gitlabCi(fakeGlab({ code: 1, stderr: 'glab: 401 Unauthorized' }).exec, () => NOW).listRuns(cfg).catch((e) => e);
    expect(err).toBeInstanceOf(ProviderError);
    expect((err as ProviderError).probe.summary).toBe('glab: 401 Unauthorized - run `glab auth login`');
  });
});

describe('gitlab probes', () => {
  it('glab-auth keeps only the host; a lapsed login and a missing glab fail with the re-login hint', async () => {
    const ok: Exec = async () => ({ code: 0, stdout: '', stderr: 'gitlab.com\n  ✓ Logged in to gitlab.com as someone (keyring)\n', ms: 1 });
    expect(await gitlabCi(ok).probe({ kind: 'glab-auth', args: {} })).toMatchObject({ status: 'ok', summary: 'logged in to gitlab.com', data: { host: 'gitlab.com' } });
    const lapsed = await gitlabCi(fakeGlab({ code: 1, stderr: 'gitlab.com\n  x gitlab.com: api call failed: 401' }).exec).probe({ kind: 'glab-auth', args: {} });
    expect(lapsed).toMatchObject({ status: 'fail', summary: 'x gitlab.com: api call failed: 401 - run `glab auth login`' });
    const missing = await gitlabCi(fakeGlab({ code: 127, stderr: 'cannot start glab: ENOENT' }).exec).probe({ kind: 'glab-auth', args: {} });
    expect(missing.summary).toBe('cannot start glab: ENOENT - install glab, then run `glab auth login`');
  });

  it('glab-pipelines and glab-jobs summarise; a bad path never starts glab', async () => {
    const g = fakeGlab();
    expect((await gitlabCi(g.exec).probe({ kind: 'glab-pipelines', args: { path: 'acme/ledgerline' } })).summary).toBe('5 pipelines, newest 2026-10-25');
    expect((await gitlabCi(g.exec).probe({ kind: 'glab-jobs', args: { path: 'acme/ledgerline', pipelineId: '70004' } })).summary).toBe('4 jobs in 3 stages');
    const before = g.calls.length;
    expect((await gitlabCi(g.exec).probe({ kind: 'glab-jobs', args: { path: '../etc', pipelineId: '1' } })).status).toBe('fail');
    expect(g.calls.length).toBe(before);
  });
});
