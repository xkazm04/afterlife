import { describe, expect, it } from 'vitest';
import { createDemoGitLab } from '@/server/gitlab/fake/demo';
import { listCommands } from '@/server/index/repositories/commandsRun';
import { listOpenProposals } from '@/server/index/repositories/work/proposal';
import { SEED_NOW } from '@/server/index/seed/parse';
import { readPollerConfig } from '@/server/poller/config';
import { confirmIntent, previewIntent, type ActionDeps } from '../run';
import type { ActionResponse } from '../types';
import { failingExecute, liveRig, policyFiles } from './rig';

const revoke = { kind: 'revoke-class', project: 'ledgerline', changes: [{ class: 'dep-bump.patch', to: 'supervised' }], why: 'manual revoke' };

function preview(r: ActionResponse) {
  if (r.status !== 'preview') throw new Error(`expected a preview, got ${r.status}: ${'reason' in r ? r.reason : ''}`);
  return r.preview;
}

describe('revoke-class', () => {
  it('previews the exact commit and writes nothing', async () => {
    const { gl, deps } = await liveRig();
    const p = preview(await previewIntent(deps, revoke));
    expect(p).toMatchObject({ kind: 'revoke-class', mode: 'live', risk: 'policy', title: 'Revoke dep-bump.patch' });
    expect(p.commands).toHaveLength(1);
    expect(p.commands[0]?.argv.slice(0, 5)).toEqual(['api', '--method', 'PUT', 'projects/90010002/repository/files/tier-state.yml', '-f']);
    expect(p.commands[0]?.display).toMatch(/^glab api --method PUT projects\/90010002\/repository\/files\/tier-state\.yml /);
    expect(p.diff.join('\n')).toMatch(/- +dep-bump\.patch: \{ tier: hands_off[^\n]*\n\+ +dep-bump\.patch: \{ tier: supervised, since: "2026-10-06T14:22:00\.000Z", by: operator kazdanm via Belay, evidence: manual revoke/);
    expect(p.summary).toContain('as kazdanm');
    expect(gl.state.writes).toEqual([]);
  });

  it('confirming commits tier-state.yml as the operator, records the command before and after, and polls', async () => {
    const { gl, db, deps, refresh } = await liveRig();
    const p = preview(await previewIntent(deps, revoke));
    const r = await confirmIntent(deps, revoke, p.previewId);
    expect(r).toMatchObject({ status: 'done', results: [{ ok: true, exit: 0, simulated: false }] });
    expect(gl.state.writes.map((w) => [w.method, w.path])).toEqual([['PUT', 'projects/90010002/repository/files/tier-state.yml']]);
    expect(policyFiles(gl)['tier-state.yml']).toMatch(/dep-bump\.patch: \{ tier: supervised, since: "2026-10-06T14:22:00\.000Z", by: operator kazdanm via Belay/);
    const rows = await listCommands(db, 'ledgerline');
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ operator: 'kazdanm', projectId: 'ledgerline', risk: 'policy', outcome: 'ok', exitCode: 0, argv: p.commands[0]?.argv });
    expect(rows[0]?.display).toBe(p.commands[0]?.display);
    expect(rows[0]?.finishedAt).not.toBeNull();
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it('a preview id from before the file changed no longer matches: nothing runs, the new preview comes back', async () => {
    const { gl, deps } = await liveRig();
    const p = preview(await previewIntent(deps, revoke));
    policyFiles(gl)['tier-state.yml'] += '# someone committed meanwhile\n';
    const r = await confirmIntent(deps, revoke, p.previewId);
    expect(r.status).toBe('changed');
    expect(gl.state.writes).toEqual([]);
    expect('preview' in r && r.preview.previewId).not.toBe(p.previewId);
  });

  it('a made-up preview id runs nothing', async () => {
    const { gl, deps } = await liveRig();
    expect((await confirmIntent(deps, revoke, 'f'.repeat(64))).status).toBe('changed');
    expect(gl.state.writes).toEqual([]);
  });

  it('refuses to raise a tier, to touch a human-only class, an unknown class, or a tier it already holds', async () => {
    const { deps } = await liveRig();
    const refuse = async (changes: unknown) => {
      const r = await previewIntent(deps, { ...revoke, changes });
      return r.status === 'refused' ? r.reason : r.status;
    };
    expect(await refuse([{ class: 'dep-bump.patch', to: 'hands_off' }])).toMatch(/only lowers a tier directly/);
    expect(await refuse([{ class: 'report.submit', to: 'quarantined' }])).toMatch(/human only/);
    expect(await refuse([{ class: 'nope.class', to: 'assisted' }])).toMatch(/not an action class/);
    expect(await refuse([{ class: 'patch-bump', to: 'quarantined' }])).toMatch(/only lowers/);
  });
});

describe('promote-class', () => {
  const promote = { kind: 'promote-class', project: 'ledgerline', class: 'qa.file-bug', to: 'hands_off' };

  it('opens a policy MR from a new branch and never pushes the higher tier to the default branch', async () => {
    const { gl, deps } = await liveRig();
    const p = preview(await previewIntent(deps, promote));
    expect(p.commands.map((c) => c.argv[2])).toEqual(['PUT', 'POST']);
    expect(p.commands[0]?.argv).toContain('start_branch=main');
    expect(p.commands[0]?.argv).toContain('branch=belay/promote-qa.file-bug-2026-10-06');
    expect(p.commands[1]?.argv).toContain('labels=belay::promotion');
    expect(p.risk).toBe('policy');
    expect(p.diff.join('\n')).toMatch(/tier: hands_off, since: "2026-10-06T14:22:00\.000Z", by: operator kazdanm via promotion MR, lease_expires: "2026-10-20/);

    const r = await confirmIntent(deps, promote, p.previewId);
    expect(r.status).toBe('done');
    const policy = gl.state.projects.find((x) => x.raw.name === 'belay-policy');
    expect(policy?.mrs.map((m) => [m.title, m.labels])).toEqual([['Promote qa.file-bug supervised -> hands_off', ['belay::promotion']]]);
  });

  it('refuses a tier above the ceiling, a lower one, and a human-only class', async () => {
    const { deps } = await liveRig();
    const why = async (cls: string, to: string) => {
      const r = await previewIntent(deps, { ...promote, class: cls, to });
      return r.status === 'refused' ? r.reason : r.status;
    };
    expect(await why('code-fix.patch', 'hands_off')).toMatch(/ceiling/);
    expect(await why('dep-bump.patch', 'supervised')).toMatch(/promotion goes up/);
    expect(await why('tier.promote', 'hands_off')).toMatch(/human only/);
  });
});

describe('mark-cra-ready and stage-gap-mr', () => {
  it('marks the clock work item ready and settles its inbox item', async () => {
    const { gl, db, deps } = await liveRig();
    const intent = { kind: 'mark-cra-ready', project: 'ledgerline', issue: 12, proposal: 'n2' };
    const p = preview(await previewIntent(deps, intent));
    expect(p.commands[0]?.argv).toEqual(['api', '--method', 'PUT', 'projects/90010001/issues/12', '-f', 'add_labels=cra::ready-to-sign', '-f', 'remove_labels=cra::drafting']);
    expect((await confirmIntent(deps, intent, p.previewId)).status).toBe('done');
    expect(gl.state.writes.map((w) => w.path)).toEqual(['projects/90010001/issues/12']);
    expect((await listOpenProposals(db, 'ledgerline')).some((x) => x.id === 'n2')).toBe(false);
    expect((await listCommands(db))[0]).toMatchObject({ proposalId: 'n2' });
  });

  const gap = {
    kind: 'stage-gap-mr', project: 'ledgerline', gap: 'g2', stage: 'create', from: 2, to: 3, title: 'Require the guardrail on agent-authored MRs',
    branch: 'belay/gap-g2', files: [{ path: 'CODEOWNERS', content: '* @acme-lab/belay-owners\n' }, { path: '.gitlab/duo/agent-config.yml', content: 'guardrail: required\n' }], workItem: 7,
  };

  it('one branch, one commit per file, then a draft MR, in that order', async () => {
    const { gl, deps } = await liveRig();
    const p = preview(await previewIntent(deps, gap));
    expect(p.commands.map((c) => `${c.argv[2]} ${c.argv[3]?.split('/').slice(-1)[0]}`)).toEqual(['POST CODEOWNERS', 'POST .gitlab%2Fduo%2Fagent-config.yml', 'POST merge_requests']);
    expect(p.commands[0]?.argv).toContain('start_branch=main');
    expect(p.commands[1]?.argv.join(' ')).not.toContain('start_branch');
    expect(p.commands[2]?.argv).toContain('title=Draft: Maturity gap g2: Require the guardrail on agent-authored MRs');
    expect(p.risk).toBe('low');
    expect((await confirmIntent(deps, gap, p.previewId)).status).toBe('done');
    expect(gl.state.writes).toHaveLength(3);
  });

  it('a failing command stops the rest, is recorded as failed, does not settle the item, and still polls', async () => {
    const { gl, db, deps, refresh } = await liveRig(failingExecute(2));
    const intent = { ...gap, proposal: 'n3' };
    const p = preview(await previewIntent(deps, intent));
    const r = await confirmIntent(deps, intent, p.previewId);
    expect(r).toMatchObject({ status: 'failed', results: [{ ok: true }, { ok: false, exit: 403, error: expect.stringContaining('403') }] });
    expect(gl.state.writes).toHaveLength(1); // the MR was never attempted
    expect((await listCommands(db)).map((c) => [c.outcome, c.exitCode])).toEqual([['ok', 0], ['failed', 403]]);
    expect((await listOpenProposals(db, 'ledgerline')).some((x) => x.id === 'n3')).toBe(true);
    expect(refresh).toHaveBeenCalledTimes(1);
  });
});

describe('demo mode never executes', () => {
  async function demoDeps(): Promise<{ deps: ActionDeps; gl: ReturnType<typeof createDemoGitLab> }> {
    const gl = createDemoGitLab(SEED_NOW);
    return {
      gl,
      deps: { mode: 'demo', port: gl.port, db: null, groupId: 144060371, cfg: readPollerConfig(144060371, {}), now: () => SEED_NOW, refresh: () => Promise.resolve(), gitlabId: () => Promise.resolve(null) },
    };
  }

  it('previews the same commands and "confirms" with a simulated result', async () => {
    const { deps, gl } = await demoDeps();
    const p = preview(await previewIntent(deps, revoke));
    expect(p.mode).toBe('demo');
    const r = await confirmIntent(deps, revoke, p.previewId);
    expect(r).toMatchObject({ status: 'done', results: [{ ok: true, exit: 0, simulated: true }] });
    expect(gl.state.writes).toEqual([]);
    expect(policyFiles(gl)['tier-state.yml']).toMatch(/dep-bump\.patch: \{ tier: hands_off/);
  });

  it('a stale preview id is still refused in demo mode', async () => {
    const { deps } = await demoDeps();
    expect((await confirmIntent(deps, revoke, 'a'.repeat(64))).status).toBe('changed');
  });
});
