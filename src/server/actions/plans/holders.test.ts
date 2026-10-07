// Promote and revoke find the record they move by the gate's own rule (engine/decide/standing.ts). When the gate refuses
// to pick between several holders, they refuse too, and say so in the gate's words: not "no tier record".
import { describe, expect, it } from 'vitest';
import { previewIntent } from '../run';
import { liveRig, policyFiles } from '../__tests__/rig';

const SECOND = '  ai-qa-second:\n    qa.file-bug: { tier: supervised, since: "2026-09-06T14:22:00.000Z", by: "start tier + record" }\n';

async function twoHolders() {
  const rig = await liveRig();
  const files = policyFiles(rig.gl);
  files['tier-state.yml'] = (files['tier-state.yml'] ?? '').replace('agents:\n', `agents:\n${SECOND}`);
  return rig;
}

const reason = (r: Awaited<ReturnType<typeof previewIntent>>): string => (r.status === 'refused' ? r.reason : r.status);

describe('promote and revoke when several agents hold the class', () => {
  it('revoke refuses with the reason the gate gives', async () => {
    const { gl, deps } = await twoHolders();
    const r = await previewIntent(deps, { kind: 'revoke-class', project: 'ledgerline', changes: [{ class: 'qa.file-bug', to: 'assisted' }], why: 'manual revoke' });
    expect(reason(r)).toMatch(/several agents hold qa\.file-bug \(ai-qa-second, ai-qa-acme-lab\)/);
    expect(reason(r)).not.toMatch(/no tier record/);
    expect(gl.state.writes).toEqual([]);
  });

  it('promote refuses with the reason the gate gives', async () => {
    const { gl, deps } = await twoHolders();
    const r = await previewIntent(deps, { kind: 'promote-class', project: 'ledgerline', class: 'qa.file-bug', to: 'hands_off' });
    expect(reason(r)).toMatch(/several agents hold qa\.file-bug \(ai-qa-second, ai-qa-acme-lab\)/);
    expect(reason(r)).not.toMatch(/no tier record/);
    expect(gl.state.writes).toEqual([]);
  });
});

describe('promote and revoke on a class the gate does not know', () => {
  it('a prototype key such as constructor is not an action class', async () => {
    const { deps } = await liveRig();
    const promote = await previewIntent(deps, { kind: 'promote-class', project: 'ledgerline', class: 'constructor', to: 'supervised' });
    const revoke = await previewIntent(deps, { kind: 'revoke-class', project: 'ledgerline', changes: [{ class: 'constructor', to: 'quarantined' }], why: 'x' });
    expect(reason(promote)).toMatch(/constructor is not an action class/);
    expect(reason(revoke)).toMatch(/constructor is not an action class/);
  });
});
