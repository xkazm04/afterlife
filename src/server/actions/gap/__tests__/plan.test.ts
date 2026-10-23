// apply-gap-template against the fake GitLab (the demo group), through the same preview/confirm door the other writes use.
import { describe, expect, it } from 'vitest';
import type { FakeGitLab } from '@/server/gitlab/fake/fakeGitLab';
import { LEDGERLINE_CI } from '@/server/gitlab/fake/demo/ciFile';
import { mergeMr } from '@/server/gitlab/fake/merge';
import { listOpenProposals } from '@/server/index/repositories/work/proposal';
import { failingExecute, liveRig } from '../../__tests__/rig';
import { parseIntent } from '../../intents';
import { confirmIntent, previewIntent } from '../../run';
import type { ActionResponse } from '../../types';

const secure = { kind: 'apply-gap-template', project: 'ledgerline', stage: 'secure', from: 0, to: 1, template: 'secure-includes' } as const;
const issues = { kind: 'apply-gap-template', project: 'ledgerline', stage: 'plan', from: null, to: 1, template: 'plan-issue-templates' } as const;
const ISSUE_FILE = '.gitlab/issue_templates/maturity-gap.md';
/** ledgerline's pipeline without its three scanner templates: secure at R0. */
const NO_SCANNERS = LEDGERLINE_CI.replace(/ {2}- template: Jobs\/[A-Za-z-]+\.gitlab-ci\.yml\n/g, '');

const ledgerline = (gl: FakeGitLab) => gl.state.projects.find((p) => p.raw.name === 'ledgerline')!;
const files = (gl: FakeGitLab) => ledgerline(gl).files;
async function rig(ci: string | null = NO_SCANNERS) {
  const r = await liveRig();
  if (ci === null) delete files(r.gl)['.gitlab-ci.yml'];
  else files(r.gl)['.gitlab-ci.yml'] = ci;
  return r;
}
function preview(r: ActionResponse) {
  if (r.status !== 'preview') throw new Error(`expected a preview, got ${r.status}: ${'reason' in r ? r.reason : ''}`);
  return r.preview;
}
const reason = (r: ActionResponse) => (r.status === 'refused' ? r.reason : `not refused: ${r.status}`);

describe('apply-gap-template: the intent', () => {
  const ok = (over: Record<string, unknown>) => parseIntent({ ...secure, ...over }).ok;
  it('admits a known template, a null from, and a proposal', () => {
    expect(ok({})).toBe(true);
    expect(ok({ from: null, proposal: 'n3' })).toBe(true);
    expect(parseIntent(issues).ok).toBe(true);
  });
  it('refuses an unknown template, stage or rung, and a to that raises nothing', () => {
    expect(parseIntent({ ...secure, template: 'rm-rf' })).toEqual({ ok: false, reason: expect.stringMatching(/template must be one of secure-includes/) });
    for (const over of [{ template: undefined }, { stage: 'deploy' }, { from: undefined }, { from: 5 }, { from: 0.5 }, { to: 0 }, { to: 5 }, { from: 2, to: 2 }, { from: '0' }]) {
      expect(ok(over), JSON.stringify(over)).toBe(false);
    }
  });
});

describe('apply-gap-template: secure-includes', () => {
  it('secure R0: previews one commit adding the marked gap block with the three templates, then a draft MR', async () => {
    const { gl, deps } = await rig();
    const p = preview(await previewIntent(deps, secure));
    expect(p).toMatchObject({ kind: 'apply-gap-template', mode: 'live', branch: 'belay/gap-secure-1', risk: 'low' });
    expect(p.commands.map((c) => c.argv.slice(0, 4))).toEqual([
      ['api', '--method', 'PUT', 'projects/90010001/repository/files/.gitlab-ci.yml'],
      ['api', '--method', 'POST', 'projects/90010001/merge_requests'],
    ]);
    const [commit, mr] = p.commands.map((c) => c.argv.join(' '));
    expect(commit).toContain('-f branch=belay/gap-secure-1');
    expect(commit).toContain('-f start_branch=main');
    expect(commit).toMatch(/-f last_commit_id=[0-9a-f]{40}/);
    expect(mr).toContain('-f labels=maturity::gap');
    expect(mr).toContain('-f title=Draft: Maturity gap secure R0 -> R1: include SAST, Secret Detection and Dependency Scanning');
    expect(mr).toContain('include Jobs/SAST.gitlab-ci.yml, Jobs/Secret-Detection.gitlab-ci.yml and Jobs/Dependency-Scanning.gitlab-ci.yml');
    expect(mr).toContain('-f remove_source_branch=true');
    expect(p.diff[0]).toBe('@@ .gitlab-ci.yml · after line 9');
    expect(p.diff.slice(1)).toEqual([
      expect.stringMatching(/^\+ {3}# belay:gap secure secure-includes begin [0-9a-f]{12}$/),
      '+   - template: Jobs/SAST.gitlab-ci.yml',
      '+   - template: Jobs/Secret-Detection.gitlab-ci.yml',
      '+   - template: Jobs/Dependency-Scanning.gitlab-ci.yml',
      '+   # belay:gap secure secure-includes end',
    ]);
    expect(gl.state.writes).toEqual([]);
  });

  it('confirming opens the draft MR on belay/gap-secure-1 and closes the proposal as acted; merged, the gap is refused again', async () => {
    const { gl, db, deps } = await rig();
    const intent = { ...secure, proposal: 'n3' };
    const p = preview(await previewIntent(deps, intent));
    expect((await listOpenProposals(db, 'ledgerline')).some((x) => x.id === 'n3')).toBe(true);
    const r = await confirmIntent(deps, intent, p.previewId);
    expect(r.status === 'done' && r.results.map((x) => x.made)).toEqual([expect.stringMatching(/^commit [0-9a-f]{8}$/), expect.stringMatching(/^!\d+$/)]);
    expect((await listOpenProposals(db, 'ledgerline')).some((x) => x.id === 'n3')).toBe(false);
    const opened = ledgerline(gl).mrs.find((m) => m.source_branch === 'belay/gap-secure-1')!;
    expect(opened).toMatchObject({ labels: ['maturity::gap'], target_branch: 'main' });
    expect(files(gl)['.gitlab-ci.yml']).toBe(NO_SCANNERS); // main moves only when a person merges
    await mergeMr(gl, 90010001, Number(opened.iid));
    expect(files(gl)['.gitlab-ci.yml']).toContain(p.diff.slice(1).map((l) => l.slice(2)).join('\n'));
    expect(reason(await previewIntent(deps, secure))).toMatch(/already has a belay:gap secure-includes block/);
  });

  it('a confirm whose MR command fails leaves the proposal open', async () => {
    const { gl, db, deps } = await liveRig(failingExecute(2));
    files(gl)['.gitlab-ci.yml'] = NO_SCANNERS;
    const intent = { ...secure, proposal: 'n3' };
    const p = preview(await previewIntent(deps, intent));
    expect(await confirmIntent(deps, intent, p.previewId)).toMatchObject({ status: 'failed', results: [{ ok: true }, { ok: false }] });
    expect((await listOpenProposals(db, 'ledgerline')).some((x) => x.id === 'n3')).toBe(true);
  });

  it('refuses a template line already included, a one-line include:, a non-list include:, and no .gitlab-ci.yml', async () => {
    expect(reason(await previewIntent((await rig(LEDGERLINE_CI)).deps, secure))).toMatch(/already includes Jobs\/SAST\.gitlab-ci\.yml: there is nothing to add/);
    const legacy = NO_SCANNERS.replace('include:\n', 'include:\n  - template: Security/Secret-Detection.gitlab-ci.yml\n');
    expect(reason(await previewIntent((await rig(legacy)).deps, secure))).toMatch(/already includes Jobs\/Secret-Detection/);
    expect(reason(await previewIntent((await rig('stages: [build]\ninclude: ci/local.yml\n')).deps, secure))).toMatch(/writes include: on one line/);
    expect(reason(await previewIntent((await rig('stages: [build]\ninclude:\n  local: ci/local.yml\n')).deps, secure))).toMatch(/include: that is not a list/);
    expect(reason(await previewIntent((await rig(null)).deps, secure))).toMatch(/has no \.gitlab-ci\.yml on main/);
  });

  it('refuses a template that does not earn the intent stage and rung', async () => {
    const { deps } = await rig();
    expect(reason(await previewIntent(deps, { ...secure, stage: 'package' }))).toBe('the secure-includes template earns secure R1, not package R1: nothing is planned');
    expect(reason(await previewIntent(deps, { ...secure, from: 1, to: 2 }))).toMatch(/earns secure R1, not secure R2/);
  });

  it('package-build from an unknown rung adds Jobs/Build, and says the rung was unknown', async () => {
    const { deps } = await rig();
    const p = preview(await previewIntent(deps, { ...secure, stage: 'package', from: null, template: 'package-build' }));
    expect(p.branch).toBe('belay/gap-package-1');
    expect(p.diff.slice(2, 3)).toEqual(['+   - template: Jobs/Build.gitlab-ci.yml']);
    const mr = p.commands[1]!.argv.join(' ');
    expect(mr).toContain('title=Draft: Maturity gap package R? -> R1: build an image per release');
    expect(mr).toContain('its rung is unknown');
  });
});

describe('apply-gap-template: plan-issue-templates', () => {
  it('adds the new file, shown whole, on belay/gap-plan-1', async () => {
    const { deps } = await rig();
    const p = preview(await previewIntent(deps, issues));
    expect(p.branch).toBe('belay/gap-plan-1');
    expect(p.commands.map((c) => c.argv.slice(2, 4))).toEqual([
      ['POST', `projects/90010001/repository/files/${encodeURIComponent(ISSUE_FILE)}`],
      ['POST', 'projects/90010001/merge_requests'],
    ]);
    expect(p.diff[0]).toMatch(/^\+ \.gitlab\/issue_templates\/maturity-gap\.md \(\d+ lines\)$/);
    expect(p.diff).toContain('+ ## Done when');
    expect(p.diff.slice(1).every((l) => l.startsWith('+ ') || l === '+ ')).toBe(true);
  });

  it('is refused when the file exists', async () => {
    const { gl, deps } = await rig();
    files(gl)[ISSUE_FILE] = 'mine\n';
    expect(reason(await previewIntent(deps, issues))).toMatch(/maturity-gap\.md already exists on main/);
  });
});
