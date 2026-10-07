// A plan's target is a watched project, never one of Belay's own (belay-policy, belay-ledger, belay-pack, belay-engine):
// tier-state.yml changes only through revoke (lower) or a promotion MR, never as a gap MR's files or a label (F50).
import { describe, expect, it } from 'vitest';
import { previewIntent } from '../../run';
import { liveRig } from '../../__tests__/rig';

const gap = (project: string) => ({
  kind: 'stage-gap-mr', project, gap: 'g1', stage: 'verify', from: 1, to: 2, title: 'raise it', branch: 'belay/gap-g1',
  files: [{ path: 'tier-state.yml', content: 'version: 1\npolicy_sha: x\nagents: {}\n' }],
});

describe('locate: never a target among the infra projects', () => {
  for (const project of ['belay-policy', 'belay-ledger']) {
    it(`refuses a gap MR and a CRA label in ${project}`, async () => {
      const { gl, deps } = await liveRig();
      for (const intent of [gap(project), { kind: 'mark-cra-ready', project, issue: 1 }]) {
        const r = await previewIntent(deps, intent);
        expect(r.status === 'refused' ? r.reason : `${r.status}: ${r.status === 'preview' ? r.preview.summary : ''}`).toMatch(new RegExp(`${project} is Belay's own project`));
      }
      expect(gl.state.writes).toEqual([]);
    });
  }
});
