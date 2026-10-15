// The human key read back on belay-policy's default branch, against the fake GitLab: verified only when all three settings
// are in place, failed naming each one that is not, unknown with the reason when a read is refused.
import { describe, expect, it } from 'vitest';
import { GitLabError } from '@/server/gitlab/errors';
import { createDemoGitLab, GROUP_ID } from '@/server/gitlab/fake/demo';
import type { FakeGitLab } from '@/server/gitlab/fake/fakeGitLab';
import { projectNamed } from '@/server/gitlab/fake/setupDone';
import { judgeHumanKey, readHumanKey } from './humanKey';

const level = (access_level: number, access_level_description: string) => ({ access_level, access_level_description, user_id: null, group_id: null });

/** The demo group with the human key in place on belay-policy's main. */
function keyed(plan: 'ultimate' | 'free' = 'ultimate'): FakeGitLab {
  const gl = createDemoGitLab(undefined, { plan });
  const policy = projectNamed(gl, 'belay-policy');
  policy.protectedBranches = {
    main: { name: 'main', push_access_levels: [level(0, 'No one')], merge_access_levels: [level(40, 'Maintainers')], allow_force_push: false, code_owner_approval_required: true },
  };
  policy.approvalSettings = { merge_requests_author_approval: false };
  return gl;
}

const read = (gl: FakeGitLab) => readHumanKey(gl.port, GROUP_ID, 'belay-policy');

describe('the human key on belay-policy main, read only', () => {
  it('all three settings in place: verified', async () => {
    expect(await read(keyed())).toEqual({ state: 'verified', missing: [], where: 'belay-policy main' });
  });

  it('push allowed to Maintainers: failed, naming it', async () => {
    const gl = keyed();
    projectNamed(gl, 'belay-policy').protectedBranches!.main!.push_access_levels = [level(40, 'Maintainers')];
    expect(await read(gl)).toEqual({ state: 'failed', missing: ['push to belay-policy main is allowed to Maintainers (it must be No one)'], where: 'belay-policy main' });
  });

  it("an MR's author allowed to approve it: failed, naming it", async () => {
    const gl = keyed();
    projectNamed(gl, 'belay-policy').approvalSettings = { merge_requests_author_approval: true };
    expect(await read(gl)).toMatchObject({ state: 'failed', missing: ["an MR's author can approve their own MR in belay-policy"] });
  });

  it('Code Owner approval off, or main not protected at all: failed, naming it', async () => {
    const gl = keyed();
    projectNamed(gl, 'belay-policy').protectedBranches!.main!.code_owner_approval_required = false;
    expect((await read(gl)).missing).toEqual(['a merge into belay-policy main does not require Code Owner approval']);
    projectNamed(gl, 'belay-policy').protectedBranches = {};
    expect((await read(gl)).missing).toEqual(['belay-policy main is not a protected branch']);
  });

  it('a refused read (approvals are Premium and up: 403 on Free) is unknown, with the reason, never verified', async () => {
    const k = await read(keyed('free'));
    expect(k.state).toBe('unknown');
    expect(k.missing).toEqual([]);
    expect(k.why).toMatch(/^belay-policy's approval settings \(.*(403|forbidden)/i);
  });

  it('a refused read beside a setting that fails: failed, and says what was not read', async () => {
    const gl = keyed('free');
    projectNamed(gl, 'belay-policy').protectedBranches!.main!.push_access_levels = [level(30, 'Developers + Maintainers')];
    const k = await read(gl);
    expect(k.state).toBe('failed');
    expect(k.missing).toEqual(['push to belay-policy main is allowed to Developers + Maintainers (it must be No one)']);
    expect(k.why).toContain("belay-policy's approval settings");
  });

  it('a group with no belay-policy: failed, naming it; a listing that fails: unknown with the reason', async () => {
    expect(await readHumanKey(keyed().port, GROUP_ID, 'no-policy')).toEqual({ state: 'failed', missing: ['the group has no acme-lab/no-policy project'] });
    const port = keyed().port;
    const refused = Object.assign(Object.create(port) as typeof port, { listProjects: () => Promise.reject(new GitLabError('auth', '401 Unauthorized', 'groups')) });
    const k = await readHumanKey(refused, GROUP_ID, 'belay-policy');
    expect(k).toMatchObject({ state: 'unknown', missing: [] });
    expect(k.why).toBe('finding belay-policy failed: auth: 401 Unauthorized');
  });

  it('judges a user, a group or a deploy key on the push list as someone who can push', () => {
    const at = { project: 'belay-policy', branch: 'main' };
    const branch = { ok: true as const, value: { push_access_levels: [{ access_level: 40, user_id: 7 }, { access_level: 0 }], code_owner_approval_required: true } };
    const k = judgeHumanKey(at, branch, { ok: true, value: { merge_requests_author_approval: false } });
    expect(k).toEqual({ state: 'failed', missing: ['push to belay-policy main is allowed to user 7 (it must be No one)'], where: 'belay-policy main' });
  });
});
