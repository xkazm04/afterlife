// A fake GitLab group built from the demo dataset (src/lib/demo): `acme-lab` with ledgerline (MRs, notes, deployments),
// belay-policy (trust-policy.yml, tier-state.yml) and belay-ledger (a verifying hash chain of events, and the closed cycles). Polling it reproduces what
// the demo shows for the deep project, which is how live mode is demoable without a real group.
// Not recorded from GitLab: every shape is [R] from the docs, like fake/__fixtures__/docs.
import { SEED_NOW } from '@/server/index/seed/parse';
import type { Rec } from '../../adapter/fields';
import { createFakeGitLab, type FakeGitLab, type FakeOptions } from '../fakeGitLab';
import { project } from '../dataset';
import { GROUP_ID, GROUP_PATH, LEDGER_GID, LEDGERLINE_GID, POLICY_GID } from './ids';
import { ledgerlineData } from './ledgerline';
import { ledgerJsonl } from './ledger';
import { cyclesJsonl } from './cycles';
import { tierStateYaml, trustPolicyYaml } from './policy';

export { GROUP_ID, GROUP_PATH, LEDGERLINE_GID } from './ids';
export { ledgerEvents } from './ledger';
export { cycleRecords } from './cycles';

const raw = (id: number, name: string, namespace: string): Rec => ({
  id, name, path: name, path_with_namespace: `${namespace}/${name}`, default_branch: 'main',
  web_url: `https://gitlab.com/${namespace}/${name}`, visibility: 'private', archived: false,
});

/** The demo group as a fake GitLab. `anchor` is the instant every relative time is measured from (the demo's 14:22). */
export function createDemoGitLab(anchor: Date = SEED_NOW, o: Omit<FakeOptions, 'custom'> = {}): FakeGitLab {
  const projects = [
    ledgerlineData(raw(LEDGERLINE_GID, 'ledgerline', `${GROUP_PATH}/core-banking`), anchor),
    project(raw(POLICY_GID, 'belay-policy', GROUP_PATH), { files: { 'trust-policy.yml': trustPolicyYaml(), 'tier-state.yml': tierStateYaml(anchor) } }),
    project(raw(LEDGER_GID, 'belay-ledger', GROUP_PATH), {
      files: { [`events/${LEDGERLINE_GID}.jsonl`]: ledgerJsonl(anchor), [`cycles/${LEDGERLINE_GID}.jsonl`]: cyclesJsonl(anchor) },
    }),
  ];
  const group: Rec = {
    id: GROUP_ID, name: GROUP_PATH, path: GROUP_PATH, full_path: GROUP_PATH, visibility: 'private',
    web_url: `https://gitlab.com/groups/${GROUP_PATH}`,
  };
  return createFakeGitLab({ ...o, custom: { group, projects } });
}
