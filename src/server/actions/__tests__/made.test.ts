// A done answer names what GitLab made, so a screen can say it: the MR from GitLab's reply, the commit of a file write
// read back from the branch right after it. Demo mode makes nothing and names nothing.
import { describe, expect, it } from 'vitest';
import { lastCommitOf } from '@/server/gitlab/fake/reads';
import type { GitLabPort, PlannedCommand } from '@/server/gitlab/port';
import { confirmIntent, previewIntent } from '../run';
import type { ActionResponse } from '../types';
import { liveRig } from './rig';

const revoke = { kind: 'revoke-class', project: 'ledgerline', changes: [{ class: 'dep-bump.patch', to: 'supervised' }] };
const promote = { kind: 'promote-class', project: 'ledgerline', class: 'qa.file-bug', to: 'hands_off' };

function idOf(r: ActionResponse): string {
  if (r.status !== 'preview') throw new Error(`expected a preview, got ${r.status}`);
  return r.preview.previewId;
}

describe('what a done answer names', () => {
  it('a revoke names the commit tier-state.yml has on main after the write', async () => {
    const { gl, deps } = await liveRig();
    const policy = gl.state.projects.find((x) => x.raw.name === 'belay-policy')!;
    const before = lastCommitOf(policy, 'tier-state.yml');
    const r = await confirmIntent(deps, revoke, idOf(await previewIntent(deps, revoke)));
    const after = lastCommitOf(policy, 'tier-state.yml');
    expect(after).not.toBe(before);
    expect(r).toMatchObject({ status: 'done', results: [{ ok: true, made: `commit ${after.slice(0, 8)}` }] });
  });

  it('a promotion names the branch commit and the MR it opened, with the MR’s address', async () => {
    const { gl, deps } = await liveRig();
    const r = await confirmIntent(deps, promote, idOf(await previewIntent(deps, promote)));
    const mr = gl.state.projects.find((x) => x.raw.name === 'belay-policy')?.mrs.at(-1);
    expect(r).toMatchObject({ status: 'done', results: [{ made: expect.stringMatching(/^commit [0-9a-f]{8}$/) }, { made: `!${String(mr?.iid)}`, url: mr?.web_url }] });
  });

  it('demo mode makes nothing, so nothing is named', async () => {
    const { deps } = await liveRig();
    const demo = { ...deps, mode: 'demo' as const };
    const r = await confirmIntent(demo, revoke, idOf(await previewIntent(demo, revoke)));
    expect(r).toMatchObject({ status: 'done', results: [{ simulated: true }] });
    expect(r.status === 'done' && r.results.some((x) => x.made)).toBe(false);
  });
});

// GitLab's answers are data too: what reaches a command line or a screen has the shape GitLab documents, or is not used.
describe('values from GitLab are checked before they are used', () => {
  const answering = (patch: { lastCommitId?: string; body?: Record<string, unknown> }) => (port: GitLabPort): GitLabPort =>
    new Proxy(port, {
      get: (t, k, r) => {
        if (k === 'getFile' && patch.lastCommitId !== undefined) {
          return async (...a: Parameters<GitLabPort['getFile']>) => {
            const f = await t.getFile(...a);
            return f && { ...f, lastCommitId: patch.lastCommitId };
          };
        }
        if (k === 'execute' && patch.body) return async (c: PlannedCommand) => ({ ...(await t.execute(c)), body: patch.body });
        return Reflect.get(t, k, r);
      },
    });

  it.each(['HEAD', 'main', '1a2b3c4d', `${'a'.repeat(40)}\n`, `${'A'.repeat(40)}`])('a last_commit_id of %j is no commit id: nothing is planned', async (id) => {
    const { deps } = await liveRig(answering({ lastCommitId: id }));
    for (const intent of [revoke, promote]) {
      const r = await previewIntent(deps, intent);
      expect(r.status === 'refused' && r.reason).toMatch(/did not say which commit last changed tier-state\.yml/);
    }
  });

  it('an MR address that is not http(s) never reaches the screen; a made-up iid is not named', async () => {
    const { deps } = await liveRig(answering({ body: { iid: 9, web_url: 'javascript:alert(document.domain)' } }));
    const r = await confirmIntent(deps, promote, idOf(await previewIntent(deps, promote)));
    expect(r.status === 'done' && r.results[1]).toMatchObject({ ok: true, made: '!9' });
    expect(r.status === 'done' && r.results.some((x) => 'url' in x)).toBe(false);
    const odd = await liveRig(answering({ body: { iid: -1.5 } }));
    const s = await confirmIntent(odd.deps, promote, idOf(await previewIntent(odd.deps, promote)));
    expect(s.status === 'done' && s.results[1]?.made).not.toBe('!-1.5');
  });
});
