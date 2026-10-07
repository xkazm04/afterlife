// F38: arm and disarm write from a fixed branch. A branch already there is refused at preview, never committed onto; a
// confirm is done only when the MR GitLab opened is headed by the commit this confirm made.
import { describe, expect, it } from 'vitest';
import { GitLabError } from '@/server/gitlab/errors';
import type { FakeGitLab } from '@/server/gitlab/fake/fakeGitLab';
import { LEDGERLINE_CI } from '@/server/gitlab/fake/demo/ciFile';
import { lastCommitOf } from '@/server/gitlab/fake/reads';
import type { GitLabPort, PlannedCommand } from '@/server/gitlab/port';
import { liveRig } from '../../__tests__/rig';
import { confirmIntent, previewIntent, type ActionDeps } from '../../run';
import type { ActionResponse } from '../../types';
import { removeBlock } from '../block';
import { DEMO_PIN } from '../config';
import { armOf } from '../content';

const arm = { kind: 'arm-track', project: 'ledgerline', track: 'T4' } as const;
const disarm = { kind: 'disarm-track', project: 'ledgerline', track: 'T4' } as const;
const LEFT = 'c0ffee0000000000000000000000000000000001';

const ledgerline = (gl: FakeGitLab) => gl.state.projects.find((p) => p.raw.name === 'ledgerline')!;
const UNARMED = (() => {
  const r = removeBlock(LEDGERLINE_CI, armOf('T4')!);
  if (!r.ok) throw new Error('the demo file has no T4 block');
  return r.content;
})();

async function rig(o: { armed?: boolean; wrap?: (p: GitLabPort) => GitLabPort } = {}) {
  const r = await liveRig(o.wrap);
  if (!o.armed) ledgerline(r.gl).files['.gitlab-ci.yml'] = UNARMED;
  return { ...r, deps: { ...r.deps, arm: { ok: true, pin: DEMO_PIN } } as ActionDeps };
}
const reason = (r: ActionResponse) => (r.status === 'refused' ? r.reason : `not refused: ${r.status}`);
function previewId(r: ActionResponse): string {
  if (r.status !== 'preview') throw new Error(`expected a preview, got ${r.status}: ${reason(r)}`);
  return r.preview.previewId;
}

describe('an arm or disarm branch that already exists (F38 part 1)', () => {
  it('arm refuses at preview, naming the branch, its head and what to do; nothing is written', async () => {
    const { gl, deps } = await rig();
    (ledgerline(gl).branches ??= {})['belay/arm-guardrail'] = LEFT;
    const why = reason(await previewIntent(deps, arm));
    expect(why).toMatch(/belay\/arm-guardrail already exists in acme-lab\/core-banking\/ledgerline \(its head is c0ffee00\)/);
    expect(why).toMatch(/delete the branch, or merge or close its MR/);
    expect(gl.state.writes).toEqual([]);
  });

  it('disarm refuses the same way', async () => {
    const { gl, deps } = await rig({ armed: true });
    (ledgerline(gl).branches ??= {})['belay/disarm-guardrail'] = LEFT;
    expect(reason(await previewIntent(deps, disarm))).toMatch(/belay\/disarm-guardrail already exists .*c0ffee00.*delete the branch, or merge or close its MR/);
  });

  it('a branch read that fails other than 404 refuses (fail closed); a 404 plans', async () => {
    const reads: string[] = [];
    const forbidden = (port: GitLabPort): GitLabPort => new Proxy(port, {
      get: (t, k, r) => (k === 'get'
        ? async (path: string, q?: Record<string, string | number | boolean | undefined>) => {
          if (path.includes('/repository/branches/')) { reads.push(path); throw new GitLabError('forbidden', '403 Forbidden', path, 403); }
          return t.get(path, q);
        }
        : Reflect.get(t, k, r)),
    });
    const { deps } = await rig({ wrap: forbidden });
    expect(reason(await previewIntent(deps, arm))).toMatch(/could not read whether belay\/arm-guardrail exists.*403 Forbidden.*nothing is planned/);
    expect(reads).toEqual(['projects/90010001/repository/branches/belay%2Farm-guardrail']);
    expect((await previewIntent((await rig()).deps, arm)).status).toBe('preview');
  });

  it('never plans force', async () => {
    const { deps } = await rig();
    const r = await previewIntent(deps, arm);
    expect(r.status === 'preview' && r.preview.commands.flatMap((c) => c.argv).some((a) => a.startsWith('force='))).toBe(false);
  });
});
