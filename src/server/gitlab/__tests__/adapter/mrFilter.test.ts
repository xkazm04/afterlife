import { describe, expect, it } from 'vitest';
import { createGlabAdapter } from '../../adapter/glabAdapter';
import type { ExecFn } from '../../adapter/exec';
import { createFakeGitLab } from '../../fake/fakeGitLab';

const LEDGERLINE = 90010001;

describe('listMergeRequests sourceBranch', () => {
  it('asks GitLab for one source branch: N open MRs on other branches cost no extra page', async () => {
    const fake = createFakeGitLab();
    const project = fake.state.projects.find((p) => p.raw.id === LEDGERLINE);
    const base = project?.mrs[0] ?? {};
    for (let i = 0; i < 12; i++) project?.mrs.push({ ...base, id: 990000 + i, iid: 900 + i, state: 'opened', source_branch: `other-${i}` });
    project?.mrs.push({ ...base, id: 990100, iid: 999, state: 'opened', source_branch: 'belay/arm' });
    const urls: string[] = [];
    const exec: ExecFn = (file, args) => (urls.push(args.at(-1) ?? ''), fake.exec(file, args));
    const port = createGlabAdapter({ bin: 'glab', exec, pageSize: 2, sleep: async () => undefined });

    const open = await port.listMergeRequests(LEDGERLINE, { state: 'opened', sourceBranch: 'belay/arm' });

    expect(open.map((m) => m.iid)).toEqual([999]);
    expect(urls).toHaveLength(1);
    expect(urls[0]).toContain('source_branch=belay%2Farm');
  });
});
