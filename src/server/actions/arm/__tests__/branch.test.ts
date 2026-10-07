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

describe('a confirm is done only when its own commit heads the MR (F38 part 2)', () => {
  /** Someone pushes to the branch between Belay's commit and its MR: the MR GitLab opens is headed by their commit. */
  const pushedBetween = (gl: () => FakeGitLab) => (port: GitLabPort): GitLabPort => new Proxy(port, {
    get: (t, k, r) => (k === 'execute'
      ? async (c: PlannedCommand) => {
        if (c.argv.includes('POST') && c.argv.some((a) => a.endsWith('/merge_requests'))) (ledgerline(gl()).branches ??= {})['belay/arm-guardrail'] = LEFT;
        return t.execute(c);
      }
      : Reflect.get(t, k, r)),
  });

  it('an MR headed by the commit this confirm made is done', async () => {
    const { gl, deps } = await rig();
    const r = await confirmIntent(deps, arm, previewId(await previewIntent(deps, arm)));
    expect(r.status).toBe('done');
    expect(ledgerline(gl).mrs.at(-1)?.sha).toBe(lastCommitOf(ledgerline(gl), '.gitlab-ci.yml'));
  });

  it('an MR headed by any other commit fails, naming both commits', async () => {
    let fake: FakeGitLab | null = null;
    const r0 = await rig({ wrap: pushedBetween(() => fake!) });
    fake = r0.gl;
    const made = await (async () => {
      const r = await confirmIntent(r0.deps, arm, previewId(await previewIntent(r0.deps, arm)));
      return { r, commit: lastCommitOf(ledgerline(r0.gl), '.gitlab-ci.yml') };
    })();
    expect(made.r.status).toBe('failed');
    const last = made.r.status === 'failed' ? made.r.results.at(-1) : undefined;
    expect(last).toMatchObject({ ok: false, made: expect.stringMatching(/^!\d+$/) });
    expect(last?.error).toContain(LEFT);
    expect(last?.error).toContain(made.commit);
  });

  it('GitLab not naming the MR head fails rather than reports done', async () => {
    const noHead = (port: GitLabPort): GitLabPort => new Proxy(port, {
      get: (t, k, r) => (k === 'execute'
        ? async (c: PlannedCommand) => {
          const out = await t.execute(c);
          return c.argv.some((a) => a.endsWith('/merge_requests')) ? { ...out, body: { ...(out.body as object), sha: null, diff_refs: null } } : out;
        }
        : k === 'get' ? async () => { throw new GitLabError('not-found', '404 Not Found', 'x', 404); } : Reflect.get(t, k, r)),
    });
    const { deps } = await rig();
    const p = previewId(await previewIntent(deps, arm));
    const r = await confirmIntent({ ...deps, port: noHead(deps.port) }, arm, p);
    expect(r.status).toBe('failed');
    expect(r.status === 'failed' && r.results.at(-1)?.error).toMatch(/did not say which commit heads/);
  });
});
