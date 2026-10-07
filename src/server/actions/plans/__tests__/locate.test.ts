// locate() picks where a plan writes as the operator: the target and belay-policy. Both must be the paired group's own:
// a project shared in from another namespace, or a belay-policy in a subgroup, is never one (F45, F46, F47).
import { describe, expect, it } from 'vitest';
import type { GitLabPort } from '@/server/gitlab/port';
import type { GlProject } from '@/server/gitlab/types';
import { previewIntent } from '../../run';
import { liveRig, policyFiles } from '../../__tests__/rig';

/** The same port, with the group's project list rewritten. */
const listing = (f: (all: GlProject[]) => GlProject[]) => (port: GitLabPort): GitLabPort =>
  new Proxy(port, { get: (t, k, r) => (k === 'listProjects' ? async (g: string | number) => f(await t.listProjects(g)) : Reflect.get(t, k, r)) });

const LEDGER = 90010003;
/** belay-ledger, shown as a belay-policy at `where` and listed first (GitLab lists the newest first), holding a copy of the policy. */
async function impostor(where: string, ownPolicy = true) {
  const rig = await liveRig(listing((all) => {
    const fake = all.filter((p) => p.id === LEDGER).map((p) => ({ ...p, path: 'belay-policy', name: 'belay-policy', pathWithNamespace: where }));
    return [...fake, ...all.filter((p) => p.id !== LEDGER && (ownPolicy || p.path !== 'belay-policy'))];
  }));
  const ledger = rig.gl.state.projects.find((p) => p.raw.id === LEDGER);
  if (!ledger) throw new Error('no belay-ledger');
  Object.assign(ledger.files, policyFiles(rig.gl));
  return rig;
}

const revoke = { kind: 'revoke-class', project: 'ledgerline', changes: [{ class: 'qa.file-bug', to: 'assisted' }], why: 'manual revoke' };
const promote = { kind: 'promote-class', project: 'ledgerline', class: 'qa.file-bug', to: 'hands_off' };
type R = Awaited<ReturnType<typeof previewIntent>>;
const summary = (r: R): string => (r.status === 'preview' ? r.preview.summary : r.status === 'refused' ? `refused: ${r.reason}` : r.status);
const argv = (r: R): string => (r.status === 'preview' ? r.preview.commands.map((c) => c.argv.join(' ')).join('\n') : '');

describe('locate: the policy project is the group\'s own belay-policy', () => {
  for (const where of ['acme-lab/team/belay-policy', 'outsider/belay-policy']) {
    it(`revoke and promote write to acme-lab/belay-policy, not ${where} listed before it`, async () => {
      const { deps } = await impostor(where);
      for (const intent of [revoke, promote]) {
        const r = await previewIntent(deps, intent);
        expect(summary(r)).toMatch(/ acme-lab\/belay-policy /);
        expect(argv(r)).toContain('projects/90010002/');
        expect(argv(r)).not.toContain(`projects/${LEDGER}/`);
      }
    });

    it(`refuses when the only belay-policy listed is ${where}`, async () => {
      const { gl, deps } = await impostor(where, false);
      expect(summary(await previewIntent(deps, revoke))).toMatch(/refused: the group has no acme-lab\/belay-policy project/);
      expect(gl.state.writes).toEqual([]);
    });
  }
});
