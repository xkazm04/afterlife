// A done answer names what GitLab made, so a screen can say it: the MR from GitLab's reply, the commit of a file write
// read back from the branch right after it. Demo mode makes nothing and names nothing.
import { describe, expect, it } from 'vitest';
import { lastCommitOf } from '@/server/gitlab/fake/reads';
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
