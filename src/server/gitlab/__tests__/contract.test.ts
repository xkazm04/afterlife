// One contract, two implementations: the fake GitLab and the glab adapter fed raw JSON recorded
// from the real group. Both must answer the identity/group reads identically.
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import type { ExecFn } from '../adapter/exec';
import { failureToError, type GitLabErrorKind } from '../errors';
import { createGlabAdapter } from '../adapter/glabAdapter';
import { createFakeGitLab } from '../fake/fakeGitLab';
import type { GitLabPort } from '../port';
import user from '../__fixtures__/live/user.json';
import group from '../__fixtures__/live/group.json';
import namespace from '../__fixtures__/live/namespace.json';
import metadata from '../__fixtures__/live/metadata.json';
import groupProjects from '../__fixtures__/live/group-projects.json';

const ROUTES: Record<string, unknown> = {
  user: user.data, 'groups/144060371': group.data, 'namespaces/144060371': namespace.data, metadata: metadata.data,
};

/** Replays the live recordings, the way `glab api` printed them. */
const recorded: ExecFn = async (_f, args) => {
  const url = args[1] ?? '';
  const [path = ''] = url.split('?');
  if (path === 'groups/144060371/projects') return { code: 0, stdout: JSON.stringify(groupProjects.data), stderr: '' };
  const body = ROUTES[path];
  return body === undefined
    ? { code: 1, stdout: '{"error":"404 Not Found"}', stderr: 'glab: HTTP 404\n' }
    : { code: 0, stdout: JSON.stringify(body), stderr: '' };
};

const impls: Array<[string, () => GitLabPort]> = [
  ['fake (free plan, no projects: the real group today)', () => createFakeGitLab({ plan: 'free', projects: false }).port],
  ['glab adapter over live recordings', () => createGlabAdapter({ bin: 'glab', exec: recorded })],
];

describe.each(impls)('GitLabPort contract: %s', (_name, make) => {
  it('reads the signed-in user', async () => {
    const u = await make().currentUser();
    expect(u).toMatchObject({ id: 35338952, username: 'kazdanm', bot: false });
  });

  it('reads the group and its namespace plan', async () => {
    const port = make();
    expect(await port.getGroup(144060371)).toMatchObject({ id: 144060371, path: 'afterlife3274741', visibility: 'private' });
    expect(await port.getNamespace(144060371)).toMatchObject({ kind: 'group', plan: 'free', trial: false });
  });

  it('reads the instance version', async () => {
    expect((await make().instance()).version).toMatch(/^\d+\.\d+\./);
  });

  it('lists no projects in the empty group', async () => {
    expect(await make().listProjects(144060371)).toEqual([]);
  });

  it('exposes the planned-command builders and a host', () => {
    const port = make();
    expect(port.host).toBeUndefined();
    expect(port.plan.addNote({ project: 1, iid: 1, body: 'x' }).argv[0]).toBe('api');
  });
});

// The real 403/404 answers recorded 2026-10-06 (err-*.json, stderr as glab printed it): the only ground truth for how a
// refusal looks. The fixture directory is the list, so a newly recorded refusal is replayed without anyone remembering to.
const LIVE = join(import.meta.dirname, '..', '__fixtures__', 'live');
const KIND: Record<number, GitLabErrorKind> = { 403: 'forbidden', 404: 'not-found' };
const refusals = readdirSync(LIVE).filter((n) => /^err-.*\.json$/.test(n)).map((n) => {
  const fx = JSON.parse(readFileSync(join(LIVE, n), 'utf8')) as { _endpoint: string; _status: number; _glab_stderr: string; data: unknown };
  return { name: n, status: fx._status, stderr: fx._glab_stderr, stdout: JSON.stringify(fx.data), path: fx._endpoint.replace(/^GET \/api\/v4\//, '').replace(/projects\/\d+/, 'projects/90010001') };
});

describe('recorded refusals', () => {
  it('finds the recorded refusals', () => {
    expect(refusals.length).toBeGreaterThanOrEqual(3);
  });

  it.each(refusals.map((r) => [r.name, r] as const))('%s: the adapter types it as recorded, and the free-plan fake refuses the same way', async (_n, r) => {
    expect(failureToError({ code: 1, stdout: r.stdout, stderr: `${r.stderr}\n` }, r.path)).toMatchObject({ kind: KIND[r.status], status: r.status });
    const fake = createFakeGitLab({ plan: 'free' }).port;
    const [path = '', qs = ''] = r.path.split('?');
    await expect(fake.get(path, Object.fromEntries(new URLSearchParams(qs)))).rejects.toMatchObject({ kind: KIND[r.status], status: r.status });
  });
});
