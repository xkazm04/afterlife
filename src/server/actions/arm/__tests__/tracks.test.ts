// Arm and disarm T3, T6 and T1 against the fake GitLab (the demo group's ledgerline, T4 already armed), through the same
// preview/confirm door T4 uses. Each block sits beside the others and a disarm removes exactly its own.
import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import type { FakeGitLab } from '@/server/gitlab/fake/fakeGitLab';
import { LEDGERLINE_CI } from '@/server/gitlab/fake/demo/ciFile';
import { mergeMr } from '@/server/gitlab/fake/merge';
import { liveRig } from '../../__tests__/rig';
import { confirmIntent, previewIntent, type ActionDeps } from '../../run';
import type { ActionResponse } from '../../types';
import { findBlock } from '../block';
import { DEMO_PIN } from '../config';
import { armOf } from '../content';
import { checkArm } from '../read';

const EXAMPLE = fs.readFileSync(path.resolve(import.meta.dirname, '../../../../../gitlab/examples/target-project/.gitlab-ci.yml'), 'utf8');
const ledgerline = (gl: FakeGitLab) => gl.state.projects.find((p) => p.raw.name === 'ledgerline')!;
const files = (gl: FakeGitLab) => ledgerline(gl).files;
const intent = (kind: 'arm-track' | 'disarm-track', track: string) => ({ kind, project: 'ledgerline', track }) as const;

async function rig(deps: Partial<ActionDeps> = {}) {
  const r = await liveRig();
  return { ...r, deps: { ...r.deps, arm: { ok: true, pin: DEMO_PIN }, ...deps } as ActionDeps };
}
function preview(r: ActionResponse) {
  if (r.status !== 'preview') throw new Error(`expected a preview, got ${r.status}: ${'reason' in r ? r.reason : ''}`);
  return r.preview;
}
const reason = (r: ActionResponse) => (r.status === 'refused' ? r.reason : `not refused: ${r.status}`);

/** Preview, confirm, and the person merges the MR: only then is the commit on main. */
async function land(gl: FakeGitLab, deps: ActionDeps, kind: 'arm-track' | 'disarm-track', track: string) {
  const p = preview(await previewIntent(deps, intent(kind, track)));
  expect((await confirmIntent(deps, intent(kind, track), p.previewId)).status).toBe('done');
  expect(await mergeMr(gl, 90010001, Number(ledgerline(gl).mrs.find((m) => m.source_branch === p.branch)!.iid))).toMatchObject({ status: 200 });
  return p;
}

const CASES = [
  ['T3', 'governor', 'tier-gate', '.post'],
  ['T6', 'maturity', 'maturity-scan', '.post'],
  ['T1', 'patcher', 'proof-engine', 'review'],
] as const;

describe.each(CASES)('arm-track %s', (track, key, component, stage) => {
  it(`previews one MR from belay/arm-${key} with ${component}, confirms it, verifies it, and disarm reverts exactly it`, async () => {
    const { gl, deps } = await rig();
    const p = await land(gl, deps, 'arm-track', track);
    expect(p).toMatchObject({ kind: 'arm-track', mode: 'live', branch: `belay/arm-${key}`, title: armOf(track)!.title, notes: armOf(track)!.notes });
    expect(p.diff).toContain(`+   - component: $CI_SERVER_FQDN/acme-lab/belay-pack/${component}@1.0.0`);
    expect(p.diff.join('\n')).not.toMatch(/AFTERLIFE_BOT_TOKEN|flow-dispatch|\/variables\b/);
    expect(p.commands[1]?.argv.join(' ')).toContain(`(${component} in ${stage})`);
    expect(await checkArm(deps, intent('arm-track', track))).toMatchObject({ status: 'read', armed: true, text: expect.stringMatching(new RegExp(`${track}'s arm block is in`)) });
    expect(findBlock(files(gl)['.gitlab-ci.yml']!, armOf('T4')!).state).toBe('armed'); // T4's block is untouched

    const d = await land(gl, deps, 'disarm-track', track);
    expect(d).toMatchObject({ kind: 'disarm-track', branch: `belay/disarm-${key}` });
    expect(d.diff.slice(1)).toEqual(p.diff.slice(1).map((l) => `- ${l.slice(2)}`));
    expect(files(gl)['.gitlab-ci.yml']).toBe(LEDGERLINE_CI);
    expect(await checkArm(deps, intent('disarm-track', track))).toMatchObject({ status: 'read', armed: false, text: expect.stringMatching(new RegExp(`has no ${track} arm block`)) });
  });

  it("refuses on the example's own pipeline, which already includes it by hand", async () => {
    const { gl, deps } = await rig();
    files(gl)['.gitlab-ci.yml'] = EXAMPLE;
    const label = track === 'T1' ? 'proof-engine \\(exploit-test\\)' : component;
    expect(reason(await previewIntent(deps, intent('arm-track', track)))).toMatch(new RegExp(`already includes ${label} by hand: Afterlife will not add it twice`));
  });
});

describe('the four blocks side by side', () => {
  it('T4 -> T3 -> T6 -> T1 all arm in one .gitlab-ci.yml; disarming T3 leaves the others armed', async () => {
    const { gl, deps } = await rig();
    for (const t of ['T3', 'T6', 'T1']) await land(gl, deps, 'arm-track', t);
    const ci = files(gl)['.gitlab-ci.yml']!;
    for (const t of ['T4', 'T3', 'T6', 'T1']) expect(findBlock(ci, armOf(t)!).state).toBe('armed');
    expect(ci.match(/belay-pack\/proof-engine@/g)).toHaveLength(2); // cited-diff and exploit-test, one include per class
    await land(gl, deps, 'disarm-track', 'T3');
    for (const t of ['T4', 'T6', 'T1']) expect(await checkArm(deps, intent('arm-track', t))).toMatchObject({ armed: true });
    expect(await checkArm(deps, intent('arm-track', 'T3'))).toMatchObject({ armed: false });
  });
});

describe('what T1 and T3 refuse', () => {
  it("T1's exploit-test goes in beside T4's cited-diff, but not beside a second exploit-test by hand", async () => {
    const { gl, deps } = await rig();
    expect((await previewIntent(deps, intent('arm-track', 'T1'))).status).toBe('preview');
    const byHand = '  - component: $CI_SERVER_FQDN/acme-lab/belay-pack/proof-engine@1.0.0\n    inputs: { class: exploit-test, engine_ref: v0.1.0 }\n';
    files(gl)['.gitlab-ci.yml'] = LEDGERLINE_CI.replace('  - template: Jobs/SAST', `${byHand}  - template: Jobs/SAST`);
    expect(reason(await previewIntent(deps, intent('arm-track', 'T1')))).toBe("the default branch's .gitlab-ci.yml already includes proof-engine (exploit-test) by hand: Afterlife will not add it twice");
  });

  it('T1 needs a review stage (exploit-test reads what test kept); T3 and T6 run in .post, which every pipeline has', async () => {
    const { gl, deps } = await rig();
    files(gl)['.gitlab-ci.yml'] = LEDGERLINE_CI.replace('stages: [build, test, review, deploy]', 'stages: [build, test, deploy]');
    expect(reason(await previewIntent(deps, intent('arm-track', 'T1')))).toBe("T1's proof-engine (exploit-test) runs in a review stage, and the pipeline declares no review stage: add one to stages: first");
    for (const t of ['T3', 'T6']) expect((await previewIntent(deps, intent('arm-track', t))).status).toBe('preview');
  });

  it("T3 refuses without the proof authors, before reading anything; T4's arm does not need them", async () => {
    const bare = { ok: true as const, pin: { packVersion: '1.0.0', engineRef: 'v0.1.0' } };
    const { gl, deps } = await rig({ arm: bare });
    expect(reason(await previewIntent(deps, intent('arm-track', 'T3')))).toMatch(/set AFTERLIFE_PROOF_AUTHORS/);
    expect(gl.state.writes).toEqual([]);
    expect(reason(await previewIntent(deps, intent('arm-track', 'T4')))).toMatch(/T4 is already armed/);
  });
});
