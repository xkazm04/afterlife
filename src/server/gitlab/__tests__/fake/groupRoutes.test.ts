import { describe, expect, it } from 'vitest';
import { isKind } from '../../errors';
import { createFakeGitLab } from '../../fake/fakeGitLab';
import { createDemoGitLab } from '../../fake/demo';

const GROUP = 144060371;

describe('fake GitLab: group routes check the group', () => {
  it('answers the recorded group by id and by full path', async () => {
    const { port } = createFakeGitLab();
    const g = await port.getGroup(GROUP);
    expect(g.id).toBe(GROUP);
    expect((await port.getGroup(g.fullPath)).id).toBe(GROUP);
    expect((await port.getNamespace(GROUP)).fullPath).toBe(g.fullPath);
  });

  it('404s a group id that is not the recorded one, on every group route', async () => {
    const { port } = createFakeGitLab();
    const reads = [() => port.getGroup(1), () => port.getNamespace(1), () => port.listProjects(1), () => port.listGroupMergeRequests(1), () => port.get('groups/1/releases')];
    for (const read of reads) await expect(read()).rejects.toSatisfy((e) => isKind(e, 'not-found'));
  });

  it('still answers the demo group by its own id', async () => {
    const { port } = createDemoGitLab();
    expect((await port.getGroup(GROUP)).id).toBe(GROUP);
    expect((await port.listProjects(GROUP)).length).toBeGreaterThan(0);
  });
});
