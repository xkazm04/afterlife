// Setup's arm chain in live mode, end to end against the fake GitLab: the opening state is the read of ledgerline's main,
// each arm is a confirmed MR a person merges, and each verify is checkArm's read. T1 (Patcher) needs T4, T3 and T6, so it
// stays locked until the last of them reads armed, then turns ready (recomputeLocks), and arms the same way.
import { describe, expect, it } from 'vitest';
import { setupReducer } from '@/app/features/setup/model/flow/reducer';
import { createSetupState, unmet } from '@/app/features/setup/model/flow/state';
import { verdictOf } from '@/app/features/setup/model/flow/verify';
import type { SetupState } from '@/app/features/setup/model/types';
import { DEMO } from '@/lib/demo';
import { liveRig } from '@/server/actions/__tests__/rig';
import { removeBlock } from '@/server/actions/arm/block';
import { DEMO_PIN } from '@/server/actions/arm/config';
import { armOf } from '@/server/actions/arm/content';
import { checkArm } from '@/server/actions/arm/read';
import { confirmIntent, previewIntent, type ActionDeps } from '@/server/actions/run';
import { LEDGERLINE_CI } from '@/server/gitlab/fake/demo/ciFile';
import type { FakeGitLab } from '@/server/gitlab/fake/fakeGitLab';
import { mergeMr } from '@/server/gitlab/fake/merge';
import { createBelayProjects } from '@/server/gitlab/fake/setupDone';
import { getPairing } from '@/server/index/repositories/pairing';
import { readLiveSetup, setupReads } from '../setup/read';

const IDS = DEMO.setup.arm.map(([id]) => id);
const AT = new Date('2026-10-07T09:30:00Z');
const ledgerline = (gl: FakeGitLab) => gl.state.projects.find((p) => p.raw.name === 'ledgerline')!;

async function opening() {
  const r = await liveRig();
  const plain = removeBlock(LEDGERLINE_CI, armOf('T4')!);
  if (!plain.ok) throw new Error('the demo file has no T4 block');
  ledgerline(r.gl).files['.gitlab-ci.yml'] = plain.content;
  createBelayProjects(r.gl); // step 4 reads done: T4 needs the projects it creates
  const deps = { ...r.deps, arm: { ok: true, pin: DEMO_PIN } } as ActionDeps;
  const reads = setupReads({ port: deps.port, groupId: deps.groupId, gitlabId: deps.gitlabId }, await getPairing(r.db, 'default'), 'ledgerline', () => AT);
  return { gl: r.gl, deps, s: createSetupState(DEMO.setup, 0, await readLiveSetup(reads, IDS)) };
}

/** Arm `id` as the screen does: preview, confirm, the person merges, then verify reads main. */
async function armTrack(gl: FakeGitLab, deps: ActionDeps, s: SetupState, id: string): Promise<SetupState> {
  const intent = { kind: 'arm-track', project: 'ledgerline', track: id } as const;
  const p = await previewIntent(deps, intent);
  if (p.status !== 'preview') throw new Error(`${id}: ${'reason' in p ? p.reason : p.status}`);
  const done = await confirmIntent(deps, intent, p.preview.previewId);
  const mr = done.status === 'done' ? (done.results.at(-1)?.made ?? null) : null;
  await mergeMr(gl, 90010001, Number(ledgerline(gl).mrs.find((m) => m.source_branch === p.preview.branch)!.iid));
  const sent = setupReducer(s, { t: 'arm-sent', id, revert: false, mr, url: null, simulated: false });
  const verdict = verdictOf(await checkArm(deps, intent), false);
  return setupReducer(setupReducer(sent, { t: 'verify-start', id }), { t: 'verify-end', id, verdict });
}

describe('arming T4, T3 and T6 unlocks T1', () => {
  it('T1 goes locked -> ready only when T6, the last of its needs, reads armed; then it arms too', async () => {
    const { gl, deps, s: s0 } = await opening();
    const st = (s: SetupState) => ['T4', 'T3', 'T6', 'T1'].map((id) => s.arm[id]?.st);
    expect(st(s0)).toEqual(['ready', 'ready', 'ready', 'locked']);
    expect(unmet(s0, 'T1')).toEqual(['T4', 'T3', 'T6']);

    const s1 = await armTrack(gl, deps, s0, 'T4');
    expect([st(s1), unmet(s1, 'T1')]).toEqual([['armed', 'ready', 'ready', 'locked'], ['T3', 'T6']]);
    const s2 = await armTrack(gl, deps, s1, 'T3');
    expect([st(s2), unmet(s2, 'T1')]).toEqual([['armed', 'armed', 'ready', 'locked'], ['T6']]);
    const s3 = await armTrack(gl, deps, s2, 'T6');
    expect([st(s3), unmet(s3, 'T1')]).toEqual([['armed', 'armed', 'armed', 'ready'], []]);
    const s4 = await armTrack(gl, deps, s3, 'T1');
    expect(st(s4)).toEqual(['armed', 'armed', 'armed', 'armed']);
    expect(s4.arm.T1).toMatchObject({ mr: expect.stringMatching(/^!\d+$/), found: null });
  });

  it('a reload reads the same: the four blocks on main open armed', async () => {
    const { gl, deps, s } = await opening();
    let x = s;
    for (const id of ['T4', 'T3', 'T6', 'T1']) x = await armTrack(gl, deps, x, id);
    const reads = setupReads({ port: deps.port, groupId: deps.groupId, gitlabId: deps.gitlabId }, null, 'ledgerline', () => AT);
    const again = createSetupState(DEMO.setup, 0, await readLiveSetup(reads, IDS));
    expect(['T4', 'T3', 'T6', 'T1'].map((id) => again.arm[id]?.st)).toEqual(['armed', 'armed', 'armed', 'armed']);
  });
});
