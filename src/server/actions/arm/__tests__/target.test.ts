// An arm, a disarm and the verify read pick their target as locate() does (F47, F48, F50): never one of Afterlife's own
// projects, never a path that names two projects. Arm's own resolver (targetOf) once kept only the F47 half.
import { describe, expect, it } from 'vitest';
import type { GitLabPort } from '@/server/gitlab/port';
import type { GlProject } from '@/server/gitlab/types';
import { liveRig } from '../../__tests__/rig';
import { previewIntent, type ActionDeps } from '../../run';
import type { ActionResponse } from '../../types';
import { DEMO_PIN } from '../config';
import { checkArm } from '../read';

const listing = (f: (all: GlProject[]) => GlProject[]) => (port: GitLabPort): GitLabPort =>
  new Proxy(port, { get: (t, k, r) => (k === 'listProjects' ? async (g: string | number) => f(await t.listProjects(g)) : Reflect.get(t, k, r)) });

const CI = 'stages: [test, review]\n';
const reason = (r: ActionResponse) => (r.status === 'refused' ? r.reason : `not refused: ${r.status}`);

async function rig(wrap?: (p: GitLabPort) => GitLabPort) {
  const r = await liveRig(wrap);
  for (const p of r.gl.state.projects) if (p.raw.name !== 'ledgerline') p.files['.gitlab-ci.yml'] = CI; // Afterlife's own projects run pipelines too
  return { ...r, deps: { ...r.deps, arm: { ok: true, pin: DEMO_PIN } } as ActionDeps };
}

describe('arm, disarm and verify never target Afterlife\'s own projects (F50)', () => {
  for (const project of ['belay-policy', 'belay-ledger']) {
    it(`refuses ${project} for arm and disarm at preview, and for verify, with nothing written`, async () => {
      const { gl, deps } = await rig();
      for (const kind of ['arm-track', 'disarm-track'] as const) {
        expect(reason(await previewIntent(deps, { kind, project, track: 'T4' }))).toMatch(new RegExp(`${project} is Afterlife's own project`));
      }
      expect(await checkArm(deps, { kind: 'arm-track', project, track: 'T4' }, deps.cfg.infra)).toMatchObject({ status: 'refused', reason: expect.stringMatching(new RegExp(`${project} is Afterlife's own project`)) });
      expect(gl.state.writes).toEqual([]);
    });
  }
});

describe('arm, disarm and verify refuse a path that names two projects (F48)', () => {
  it('when the index has no GitLab id for it', async () => {
    const twin = listing((all) => [...all, ...all.filter((p) => p.path === 'ledgerline').map((p) => ({ ...p, id: 90019999, pathWithNamespace: 'acme-lab/other/ledgerline' }))]);
    const { deps } = await rig(twin);
    const blind = { ...deps, gitlabId: async () => null } as ActionDeps;
    for (const kind of ['arm-track', 'disarm-track'] as const) {
      expect(reason(await previewIntent(blind, { kind, project: 'ledgerline', track: 'T4' }))).toMatch(/ledgerline names 2 projects/);
    }
    expect(await checkArm(blind, { kind: 'arm-track', project: 'ledgerline', track: 'T4' }, blind.cfg.infra)).toMatchObject({ status: 'refused', reason: expect.stringMatching(/ledgerline names 2 projects/) });
  });
});
