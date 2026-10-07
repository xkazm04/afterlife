// Arm and disarm T4 against the fake GitLab (the demo group), through the same preview/confirm door the other writes use.
import { describe, expect, it } from 'vitest';
import type { FakeGitLab } from '@/server/gitlab/fake/fakeGitLab';
import { LEDGERLINE_CI } from '@/server/gitlab/fake/demo/ciFile';
import { liveRig } from '../../__tests__/rig';
import { confirmIntent, previewIntent, type ActionDeps } from '../../run';
import type { ActionResponse } from '../../types';
import { removeBlock } from '../block';
import { DEMO_PIN, readArmConfig } from '../config';
import { armOf } from '../content';
import { checkArm } from '../read';

const arm = { kind: 'arm-track', project: 'ledgerline', track: 'T4' } as const;
const disarm = { kind: 'disarm-track', project: 'ledgerline', track: 'T4' } as const;
const CI = 'projects/90010001/repository/files/.gitlab-ci.yml';

const ledgerline = (gl: FakeGitLab) => gl.state.projects.find((p) => p.raw.name === 'ledgerline')!;
const files = (gl: FakeGitLab) => ledgerline(gl).files;
const UNARMED = (() => {
  const r = removeBlock(LEDGERLINE_CI, armOf('T4')!);
  if (!r.ok) throw new Error('the demo file has no T4 block');
  return r.content;
})();

async function rig(o: { armed?: boolean; deps?: Partial<ActionDeps> } = {}) {
  const r = await liveRig();
  if (!o.armed) files(r.gl)['.gitlab-ci.yml'] = UNARMED;
  return { ...r, deps: { ...r.deps, arm: { ok: true, pin: DEMO_PIN }, ...o.deps } as ActionDeps };
}
function preview(r: ActionResponse) {
  if (r.status !== 'preview') throw new Error(`expected a preview, got ${r.status}: ${'reason' in r ? r.reason : ''}`);
  return r.preview;
}
const reason = (r: ActionResponse) => (r.status === 'refused' ? r.reason : `not refused: ${r.status}`);

describe('arm-track T4', () => {
  it('previews one MR from a new branch, with the include lines, the token notes in order, and no MR number', async () => {
    const { gl, deps } = await rig();
    const p = preview(await previewIntent(deps, arm));
    expect(p).toMatchObject({ kind: 'arm-track', mode: 'live', branch: 'belay/arm-guardrail', title: 'Arm T4 guardrail: block what it can quote' });
    expect(p.commands.map((c) => c.argv.slice(0, 4))).toEqual([['api', '--method', 'PUT', CI], ['api', '--method', 'POST', 'projects/90010001/merge_requests']]);
    const [commit, mr] = p.commands.map((c) => c.argv.join(' '));
    expect(commit).toContain('-f branch=belay/arm-guardrail');
    expect(commit).toContain('-f start_branch=main');
    expect(commit).toMatch(/-f last_commit_id=[0-9a-f]{40}/);
    expect(mr).toContain('-f source_branch=belay/arm-guardrail');
    expect(mr).toContain('-f labels=belay::arm');
    expect(p.diff[0]).toBe('@@ .gitlab-ci.yml · after line 9');
    expect(p.diff).toContain('+   - component: $CI_SERVER_FQDN/acme-lab/belay-pack/flow-dispatch@1.0.0');
    expect(p.diff.every((l, i) => i === 0 || l.startsWith('+ '))).toBe(true);
    expect(p.notes).toEqual(armOf('T4')!.notes);
    expect(JSON.stringify(p)).not.toMatch(/![0-9]/);
    expect(gl.state.writes).toEqual([]);
  });

  it('never names a token value or sets a CI variable', async () => {
    const { deps } = await rig();
    const p = preview(await previewIntent(deps, arm));
    for (const c of p.commands) expect(c.argv.join(' ')).not.toMatch(/\/variables\b|BELAY_BOT_TOKEN=|glab variable/);
  });

  it('confirming opens the MR as the operator; disarm then reverts exactly those lines', async () => {
    const { gl, deps } = await rig();
    const p = preview(await previewIntent(deps, arm));
    const r = await confirmIntent(deps, arm, p.previewId);
    expect(r.status === 'done' && r.results.map((x) => x.made)).toEqual([expect.stringMatching(/^commit [0-9a-f]{8}$/), expect.stringMatching(/^!\d+$/)]);
    const added = p.diff.slice(1).map((l) => l.slice(2));
    expect(files(gl)['.gitlab-ci.yml']).toContain(added.join('\n'));
    expect(await checkArm(deps, arm)).toMatchObject({ status: 'read', armed: true });

    // The fake has one branch, so the arm's commit is already "on main"; the person merges the MR.
    ledgerline(gl).mrs.find((m) => m.source_branch === 'belay/arm-guardrail')!.state = 'merged';
    const d = preview(await previewIntent(deps, disarm));
    expect(d).toMatchObject({ kind: 'disarm-track', branch: 'belay/disarm-guardrail' });
    expect(d.diff.slice(1)).toEqual(added.map((l) => `- ${l}`));
    expect((await confirmIntent(deps, disarm, d.previewId)).status).toBe('done');
    expect(files(gl)['.gitlab-ci.yml']).toBe(UNARMED);
    expect(await checkArm(deps, disarm)).toMatchObject({ status: 'read', armed: false, text: expect.stringMatching(/has no T4 arm block/) });
  });

  it('arms a target with no review stage: cited-diff runs in test, and the plan says so; neither review nor test refuses', async () => {
    const { gl, deps } = await rig();
    files(gl)['.gitlab-ci.yml'] = UNARMED.replace('stages: [build, test, review, deploy]', 'stages: [build, test, secure, package, deploy]');
    const p = preview(await previewIntent(deps, arm));
    const proof = p.diff.indexOf('+   - component: $CI_SERVER_FQDN/acme-lab/belay-pack/proof-engine@1.0.0');
    expect(p.diff.slice(proof).find((l) => l.includes('stage:'))).toBe('+       stage: test');
    expect(p.commands[1]?.argv.join(' ')).toContain('proof-engine in test, flow-dispatch in build');
    files(gl)['.gitlab-ci.yml'] = UNARMED.replace('stages: [build, test, review, deploy]', 'stages: [build, deploy]');
    expect(reason(await previewIntent(deps, arm))).toMatch(/neither review nor test/);
  });

  it('refuses while an MR from the arm branch is open', async () => {
    const { gl, deps } = await rig();
    ledgerline(gl).mrs.push({ ...ledgerline(gl).mrs[0]!, iid: 77, state: 'opened', source_branch: 'belay/arm-guardrail' });
    expect(reason(await previewIntent(deps, arm))).toBe('!77 from belay/arm-guardrail is already open: merge or close it first');
  });

  it('refuses a track the repo does not define, and says so', async () => {
    const { deps } = await rig();
    expect(reason(await previewIntent(deps, { ...arm, track: 'T3' }))).toMatch(/does not define T3's arm content/);
    expect(reason(await previewIntent(deps, { ...disarm, track: 'T6' }))).toMatch(/does not define T6's arm content/);
  });

  it('refuses without the per-install values, naming what is missing', async () => {
    expect(reason(await previewIntent((await rig({ deps: { arm: undefined } })).deps, arm))).toMatch(/no arm settings/);
    expect(reason(await previewIntent((await rig({ deps: { arm: readArmConfig({}) } })).deps, arm))).toMatch(/BELAY_PACK_VERSION.*BELAY_ENGINE_REF/);
    const noConsumer = readArmConfig({ BELAY_PACK_VERSION: '1.0.0', BELAY_ENGINE_REF: 'v0.1.0' });
    expect(reason(await previewIntent((await rig({ deps: { arm: noConsumer } })).deps, arm))).toMatch(/BELAY_GUARDRAIL_CONSUMER_ID/);
  });

  it('refuses to arm what is armed, and to disarm what is not', async () => {
    const armed = await rig({ armed: true });
    expect(reason(await previewIntent(armed.deps, arm))).toMatch(/T4 is already armed: its block is on main/);
    expect(await checkArm(armed.deps, arm)).toMatchObject({ status: 'read', armed: true });
    const plain = await rig();
    expect(reason(await previewIntent(plain.deps, disarm))).toMatch(/T4 is not armed on main/);
  });

  it('refuses to disarm an edited block, and verify says what it found', async () => {
    const { gl, deps } = await rig({ armed: true });
    files(gl)['.gitlab-ci.yml'] = LEDGERLINE_CI.replace('consumer_id: 4711', 'consumer_id: 4712');
    expect(reason(await previewIntent(deps, disarm))).toMatch(/edited after it was added/);
    expect(await checkArm(deps, arm)).toMatchObject({ status: 'read', armed: false, text: expect.stringMatching(/edited/) });
    delete files(gl)['.gitlab-ci.yml'];
    expect(reason(await previewIntent(deps, arm))).toMatch(/has no \.gitlab-ci\.yml on main/);
    expect(await checkArm(deps, arm)).toMatchObject({ status: 'read', armed: false, text: expect.stringMatching(/there is no \.gitlab-ci\.yml/) });
  });

  it('demo mode plans the same MR and only simulates it', async () => {
    const { gl, deps } = await rig({ deps: { mode: 'demo', db: null } });
    const p = preview(await previewIntent(deps, arm));
    expect(p.mode).toBe('demo');
    expect(await confirmIntent(deps, arm, p.previewId)).toMatchObject({ status: 'done', results: [{ simulated: true }, { simulated: true }] });
    expect(gl.state.writes).toEqual([]);
  });
});
