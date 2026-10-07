// A tier-state.yml write planned from a stale read is refused, never lands over the newer file. Confirm plans again just
// before it runs (previewId), but a commit can still land between that read and the write: the revoke and the promotion
// send the file's last_commit_id as read, and GitLab (here the fake, which models the field) refuses a stale one.
import { describe, expect, it } from 'vitest';
import { lastCommitOf } from '@/server/gitlab/fake/reads';
import type { GitLabPort } from '@/server/gitlab/port';
import { listCommands } from '@/server/index/repositories/commandsRun';
import { confirmIntent, previewIntent } from '../run';
import type { ActionResponse } from '../types';
import { liveRig, policyFiles } from './rig';

const POLICY = 90010002;
const revoke = { kind: 'revoke-class', project: 'ledgerline', changes: [{ class: 'dep-bump.patch', to: 'supervised' }] };
const promote = { kind: 'promote-class', project: 'ledgerline', class: 'qa.file-bug', to: 'hands_off' };

function idOf(r: ActionResponse): string {
  if (r.status !== 'preview') throw new Error(`expected a preview, got ${r.status}: ${'reason' in r ? r.reason : ''}`);
  return r.preview.previewId;
}

/** The same port, except that `before` runs once, just before the first command executes: a commit landing in between. */
const landsFirst = (before: (p: GitLabPort) => Promise<unknown>) => (port: GitLabPort): GitLabPort => {
  let done = false;
  return new Proxy(port, {
    get: (t, k, r) =>
      k === 'execute'
        ? async (c: Parameters<GitLabPort['execute']>[0]) => {
            if (!done) {
              done = true;
              await before(t);
            }
            return t.execute(c);
          }
        : Reflect.get(t, k, r),
  });
};

describe('a tier-state.yml write names the last commit it was planned from', () => {
  it('the revoke and the promotion send last_commit_id as read', async () => {
    const { gl, deps } = await liveRig();
    const policy = gl.state.projects.find((x) => x.raw.id === POLICY)!;
    const id = lastCommitOf(policy, 'tier-state.yml');
    for (const intent of [revoke, promote]) {
      const r = await previewIntent(deps, intent);
      expect(r.status === 'preview' && r.preview.commands[0]?.argv).toContain(`last_commit_id=${id}`);
    }
  });

  it('a commit between the last read and the write: GitLab refuses it, and the newer file stays', async () => {
    // The tripwire demotes another class while the operator's revoke is on its way.
    const tripwire = async (port: GitLabPort) => {
      const now = policyFiles(gl)['tier-state.yml'] ?? '';
      await port.execute(port.plan.commitFile({ project: POLICY, path: 'tier-state.yml', branch: 'main', content: `${now}# tripwire: code-fix.patch -> assisted\n`, message: 'tripwire', action: 'update' }));
    };
    const { gl, db, deps } = await liveRig(landsFirst(tripwire));
    const r = await confirmIntent(deps, revoke, idOf(await previewIntent(deps, revoke)));
    expect(r).toMatchObject({ status: 'failed', results: [{ ok: false, exit: 400, error: expect.stringContaining('changed since you started editing it') }] });
    expect(policyFiles(gl)['tier-state.yml']).toMatch(/# tripwire: code-fix\.patch -> assisted\n$/);
    expect(policyFiles(gl)['tier-state.yml']).toMatch(/dep-bump\.patch: \{ tier: hands_off/); // the stale revoke did not land
    expect((await listCommands(db, 'ledgerline'))[0]).toMatchObject({ outcome: 'failed', exitCode: 400 });
  });

  it('the same for the promotion: its branch never starts from a copy older than the default branch', async () => {
    const operatorRevoke = async (port: GitLabPort) => {
      await port.execute(port.plan.commitFile({ project: POLICY, path: 'tier-state.yml', branch: 'main', content: `${policyFiles(gl)['tier-state.yml']}# revoked\n`, message: 'revoke', action: 'update' }));
    };
    const { gl, deps } = await liveRig(landsFirst(operatorRevoke));
    const r = await confirmIntent(deps, promote, idOf(await previewIntent(deps, promote)));
    expect(r).toMatchObject({ status: 'failed', results: [{ ok: false, exit: 400 }] });
    expect(gl.state.projects.find((x) => x.raw.id === POLICY)?.mrs).toEqual([]); // the MR after it never ran
  });

  it('no last commit from GitLab, no plan: the write could not be refused if it were stale', async () => {
    const blind = (port: GitLabPort): GitLabPort =>
      new Proxy(port, { get: (t, k, r) => (k === 'getFile' ? async (...a: Parameters<GitLabPort['getFile']>) => { const f = await t.getFile(...a); return f && { ...f, lastCommitId: null }; } : Reflect.get(t, k, r)) });
    const { deps } = await liveRig(blind);
    for (const intent of [revoke, promote]) {
      const r = await previewIntent(deps, intent);
      expect(r.status === 'refused' && r.reason).toMatch(/did not say which commit last changed tier-state\.yml/);
    }
  });
});
