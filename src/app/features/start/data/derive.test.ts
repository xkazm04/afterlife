// What a remote says: a GitLab remote names the host, namespace and project, and its group id comes from one read; a
// remote elsewhere, no remote, or a group glab cannot read answers nulls with the reason. Fakes only.
import { describe, expect, it } from 'vitest';
import { deriveFor, hostPathOf, type DeriveDeps } from './derive';

const deps = (remote: string | null, over: Partial<DeriveDeps> = {}): DeriveDeps & { reads: string[][] } => {
  const reads: string[][] = [];
  return { host: 'gitlab.com', remote: async () => remote, groupId: async (h, p) => (reads.push([h, p]), '4242'), reads, ...over };
};

describe('deriveFor', () => {
  it('reads the namespace of an https or ssh GitLab remote, without its userinfo', async () => {
    const d = deps('https://oauth2:glpat-secret@gitlab.com/acme/platform/api.git');
    expect(await deriveFor('/r', d)).toEqual({ host: 'gitlab.com', groupPath: 'acme/platform', projectPath: 'acme/platform/api', groupId: '4242' });
    expect(d.reads).toEqual([['gitlab.com', 'acme/platform']]);
    expect(await deriveFor('/r', deps('git@gitlab.com:acme/api.git'))).toMatchObject({ groupPath: 'acme', projectPath: 'acme/api', groupId: '4242' });
  });

  it('takes a self-managed host the server is configured for', async () => {
    const d = deps('git@code.example.com:team/svc.git', { host: 'code.example.com' });
    expect(await deriveFor('/r', d)).toMatchObject({ host: 'code.example.com', groupPath: 'team', groupId: '4242' });
  });

  it('answers nulls with the reason for a remote elsewhere, no remote, and a group glab cannot read', async () => {
    expect(await deriveFor('/r', deps('https://github.com/acme/api.git'))).toEqual({ host: 'github.com', groupPath: null, groupId: null, projectPath: null, reason: 'the origin remote is on github.com, not on GitLab' });
    expect(await deriveFor('/r', deps(null))).toMatchObject({ groupPath: null, reason: expect.stringMatching(/no origin remote/) });
    const unreadable = deps('https://gitlab.com/acme/api', { groupId: () => Promise.reject(new Error('404 Group Not Found\nmore')) });
    expect(await deriveFor('/r', unreadable)).toEqual({ host: 'gitlab.com', groupPath: 'acme', projectPath: 'acme/api', groupId: null, reason: 'glab could not read the group acme: 404 Group Not Found' });
  });

  it('splits clone URLs, ports and .git dropped', () => {
    expect(hostPathOf('ssh://git@GitLab.example.com:2222/a/b.git')).toEqual({ host: 'gitlab.example.com', path: 'a/b' });
    expect(hostPathOf('not a url')).toBeNull();
  });
});
