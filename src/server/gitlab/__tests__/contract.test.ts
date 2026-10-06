// One contract, two implementations: the fake GitLab and the glab adapter fed raw JSON recorded
// from the real group. Both must answer the identity/group reads identically.
import { describe, expect, it } from 'vitest';
import type { ExecFn } from '../adapter/exec';
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
