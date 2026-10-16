// A write that carries last_commit_id is planned only from a file whose last commit GitLab named as a commit id: the three
// places that read it (a policy write, a gap hunk, an arm or disarm) refuse in one voice, naming the file they read.
import { describe, expect, it } from 'vitest';
import type { GitLabPort } from '@/server/gitlab/port';
import { liveRig } from '../../__tests__/rig';
import { DEMO_PIN } from '../../arm/config';
import { previewIntent, type ActionDeps } from '../../run';
import type { ActionResponse } from '../../types';

const withLast = (lastCommitId: string | null) => (port: GitLabPort): GitLabPort => new Proxy(port, {
  get: (t, k, r) => (k === 'getFile'
    ? async (...a: Parameters<GitLabPort['getFile']>) => { const f = await t.getFile(...a); return f ? { ...f, lastCommitId } : f; }
    : Reflect.get(t, k, r)),
});
const reason = (r: ActionResponse) => (r.status === 'refused' ? r.reason : `not refused: ${r.status}`);
const say = (path: string) => `GitLab did not say which commit last changed ${path}, so a write from a stale read could not be refused; nothing is planned`;

const arm = { kind: 'arm-track', project: 'ledgerline', track: 'T4' };
const disarm = { kind: 'disarm-track', project: 'ledgerline', track: 'T4' };
const revoke = { kind: 'revoke-class', project: 'ledgerline', changes: [{ class: 'qa.file-bug', to: 'assisted' }] };
const promote = { kind: 'promote-class', project: 'ledgerline', class: 'qa.file-bug', to: 'hands_off' };
const hunk = { kind: 'stage-gap-mr', project: 'ledgerline', gap: 'g1', stage: 'secure', from: 1, to: 2, title: 'x', branch: 'belay/gap-g1', files: [{ path: '.gitlab-ci.yml', hunk: [' stages:', '+  - extra'] }] };

describe.each([[null], ['not-a-commit'], ['abc123']])('last_commit_id %j', (bad) => {
  it.each([['arm', arm, '.gitlab-ci.yml'], ['disarm', disarm, '.gitlab-ci.yml'], ['gap hunk', hunk, '.gitlab-ci.yml'], ['revoke', revoke, 'tier-state.yml'], ['promote', promote, 'tier-state.yml']] as const)(
    '%s is refused, naming %s',
    async (_what, intent, file) => {
      const { gl, deps } = await liveRig(withLast(bad));
      const r = await previewIntent({ ...deps, arm: { ok: true, pin: DEMO_PIN } } as ActionDeps, intent);
      expect(reason(r)).toBe(say(file));
      expect(gl.state.writes).toEqual([]);
    },
  );
});
