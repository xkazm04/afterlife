import { describe, expect, it } from 'vitest';
import type { ExecFn, ExecResult } from '../adapter/exec';
import { createGlabAdapter } from '../adapter/glabAdapter';
import { GitLabError, failureToError, statusOf } from '../errors';

const okJson = (v: unknown): ExecResult => ({ code: 0, stdout: JSON.stringify(v), stderr: '' });
const httpFail = (status: number, text: string): ExecResult => ({ code: 1, stdout: `{"message":"${status} ${text}"}`, stderr: `glab: ${status} ${text} (HTTP ${status})\n` });
const pipeline = (id: number) => ({ id, project_id: 1, status: 'success', ref: 'main', sha: 'abc', created_at: 't', updated_at: 't' });

function adapter(queue: Array<ExecResult | Error>, extra: { pageSize?: number; host?: string; maxRetries?: number } = {}) {
  const calls: string[][] = [];
  const sleeps: number[] = [];
  const exec: ExecFn = async (_file, args) => {
    calls.push([...args]);
    const next = queue.shift();
    if (!next) throw new Error('exec called more often than scripted');
    if (next instanceof Error) throw next;
    return next;
  };
  const port = createGlabAdapter({ bin: 'glab', exec, sleep: async (ms) => void sleeps.push(ms), ...extra });
  return { port, calls, sleeps };
}

describe('glab adapter: requests', () => {
  it('runs `glab api <path>` with no shell and no write flags', async () => {
    const { port, calls } = adapter([okJson({ id: 1, username: 'kazdanm' })]);
    expect((await port.currentUser()).username).toBe('kazdanm');
    expect(calls).toEqual([['api', 'user']]);
  });

  it('passes the host from config and encodes query values', async () => {
    const { port, calls } = adapter([okJson([])], { host: 'gitlab.example.com' });
    await port.listMergeRequests('grp/proj', { state: 'opened', labels: ['proof::pass', 'a b'] });
    expect(calls[0]).toEqual([
      'api', '--hostname', 'gitlab.example.com',
      'projects/grp%2Fproj/merge_requests?state=opened&labels=proof%3A%3Apass%2Ca+b&per_page=100&page=1',
    ]);
  });
});

describe('glab adapter: pagination', () => {
  it('walks pages until a short page', async () => {
    const { port, calls } = adapter([okJson([pipeline(3), pipeline(2)]), okJson([pipeline(1)])], { pageSize: 2 });
    expect((await port.listPipelines(1)).map((p) => p.id)).toEqual([3, 2, 1]);
    expect(calls.map((c) => c[1])).toEqual(['projects/1/pipelines?per_page=2&page=1', 'projects/1/pipelines?per_page=2&page=2']);
  });

  it('asks for one more page when the last page was full, and stops on an empty one', async () => {
    const { port, calls } = adapter([okJson([pipeline(2), pipeline(1)]), okJson([])], { pageSize: 2 });
    expect(await port.listPipelines(1)).toHaveLength(2);
    expect(calls).toHaveLength(2);
  });

  it('stops at limit and trims', async () => {
    const { port, calls } = adapter([okJson([pipeline(3), pipeline(2), pipeline(1)])]);
    expect((await port.listPipelines(1, { limit: 2 })).map((p) => p.id)).toEqual([3, 2]);
    expect(calls[0]?.[1]).toBe('projects/1/pipelines?per_page=2&page=1');
  });
});

describe('glab adapter: error mapping', () => {
  const kindOf = async (r: ExecResult | Error) => {
    try { await adapter([r]).port.currentUser(); } catch (e) { return e instanceof GitLabError ? e.kind : 'other'; }
    return 'none';
  };

  it.each([
    [httpFail(401, 'Unauthorized'), 'auth'],
    [httpFail(403, 'Forbidden'), 'forbidden'],
    [httpFail(404, 'Project Not Found'), 'not-found'],
    [httpFail(500, 'Internal Server Error'), 'api'],
    [{ code: 1, stdout: '', stderr: 'ERROR: no token found for gitlab.com. Run glab auth login' }, 'auth'],
    [{ code: 1, stdout: '', stderr: 'Get "https://gitlab.com/api/v4/user": dial tcp: lookup gitlab.com: no such host' }, 'network'],
    [{ code: 1, stdout: '{"error":"404 Not Found"}', stderr: 'glab: HTTP 404\n' }, 'not-found'],
    [new GitLabError('binary', 'cannot start glab: ENOENT', 'glab'), 'binary'],
  ] as const)('maps %# to %s', async (result, kind) => {
    expect(await kindOf(result as ExecResult | Error)).toBe(kind);
  });

  it('retries 429 with exponential backoff, then succeeds', async () => {
    const { port, calls, sleeps } = adapter([httpFail(429, 'Too Many Requests'), httpFail(429, 'Too Many Requests'), okJson({ id: 1, username: 'u' })]);
    await port.currentUser();
    expect(calls).toHaveLength(3);
    expect(sleeps).toEqual([1000, 2000]);
  });

  it('gives up on 429 after maxRetries with kind rate-limited', async () => {
    const { port, calls } = adapter([httpFail(429, 'x'), httpFail(429, 'x'), httpFail(429, 'x')], { maxRetries: 2 });
    await expect(port.currentUser()).rejects.toMatchObject({ kind: 'rate-limited', status: 429 });
    expect(calls).toHaveLength(3);
  });

  it('does not retry a 403', async () => {
    const { port, calls } = adapter([httpFail(403, 'Forbidden')]);
    await expect(port.currentUser()).rejects.toMatchObject({ kind: 'forbidden' });
    expect(calls).toHaveLength(1);
  });

  it('reports non-JSON output as a parse error', async () => {
    const { port } = adapter([{ code: 0, stdout: '<html>', stderr: '' }]);
    await expect(port.currentUser()).rejects.toMatchObject({ kind: 'parse' });
  });

  it('missing/404 optional reads return null or unavailable instead of throwing', async () => {
    const a = adapter([httpFail(404, 'File Not Found')]).port;
    expect(await a.getFile(1, 'x.yml', 'main')).toBeNull();
    expect(await adapter([httpFail(404, 'Not found')]).port.testReportSummary(1, 5)).toBeNull();
    const v = await adapter([httpFail(403, 'Forbidden')]).port.listVulnerabilities(1);
    expect(v.status).toBe('unavailable');
  });

  it('statusOf reads glab stderr and falls back to the JSON body', () => {
    expect(statusOf({ code: 1, stdout: '', stderr: 'glab: 403 Forbidden (HTTP 403)\n' })).toBe(403);
    expect(statusOf({ code: 1, stdout: '{"message":"404 Project Not Found"}', stderr: '' })).toBe(404);
    expect(failureToError({ code: 1, stdout: '', stderr: 'boom' }, 'x').kind).toBe('api');
  });
});

describe('execute', () => {
  it('runs the planned argv once, without retry, and parses the JSON body', async () => {
    const { port, calls } = adapter([okJson({ iid: 9 })]);
    const out = await port.execute(port.plan.addNote({ project: 1, iid: 2, body: 'b' }));
    expect(calls).toEqual([['api', '--method', 'POST', 'projects/1/merge_requests/2/notes', '-f', 'body=b']]);
    expect(out.body).toEqual({ iid: 9 });
  });

  it('does not retry a rate-limited write', async () => {
    const { port, calls } = adapter([httpFail(429, 'x'), okJson({})]);
    await expect(port.execute(port.plan.addNote({ project: 1, iid: 2, body: 'b' }))).rejects.toMatchObject({ kind: 'rate-limited' });
    expect(calls).toHaveLength(1);
  });

  it('refuses anything that is not `glab api`', async () => {
    const { port, calls } = adapter([]);
    await expect(port.execute({ argv: ['mr', 'create'], display: 'glab mr create', risk: 'low' })).rejects.toBeInstanceOf(GitLabError);
    expect(calls).toHaveLength(0);
  });
});
