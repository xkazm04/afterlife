// The group's projects are read through one door: GitLab lists projects shared into the group too unless with_shared is
// false (its default is true), so every caller would otherwise see projects of other namespaces as the group's (F45).
import { describe, expect, it } from 'vitest';
import type { ExecFn } from '../adapter/exec';
import { createGlabAdapter } from '../adapter/glabAdapter';

describe('glab adapter: listProjects', () => {
  it("asks for the group's own projects and its subgroups', never projects shared into it", async () => {
    const calls: string[][] = [];
    const exec: ExecFn = async (_file, args) => {
      calls.push([...args]);
      return { code: 0, stdout: '[]', stderr: '' };
    };
    await createGlabAdapter({ bin: 'glab', exec, sleep: async () => {} }).listProjects('acme-lab');
    const query = new URLSearchParams(calls[0]?.[1]?.split('?')[1] ?? '');
    expect(query.get('with_shared')).toBe('false');
    expect(query.get('include_subgroups')).toBe('true');
  });
});
