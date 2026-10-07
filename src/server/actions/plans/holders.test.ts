// Promote and revoke find the records they move by the gate's own rule (engine/decide/standing.ts). When several agents
// hold the class, revoke lowers every holder above the target in one commit (F34); promote, which needs one record, still
// refuses in the gate's words: not "no tier record".
import { parse } from 'yaml';
import { describe, expect, it } from 'vitest';
import { confirmIntent, previewIntent } from '../run';
import { liveRig, policyFiles } from '../__tests__/rig';

const second = (tier: string) => `  ai-qa-second:\n    qa.file-bug: { tier: ${tier}, since: "2026-09-06T14:22:00.000Z", by: "start tier + record" }\n`;

/** qa.file-bug held by ai-qa-acme-lab (supervised, the demo's) and ai-qa-second at `tier`. */
async function twoHolders(tier = 'supervised') {
  const rig = await liveRig();
  const files = policyFiles(rig.gl);
  files['tier-state.yml'] = (files['tier-state.yml'] ?? '').replace('agents:\n', `agents:\n${second(tier)}`);
  return rig;
}

const reason = (r: Awaited<ReturnType<typeof previewIntent>>): string => (r.status === 'refused' ? r.reason : r.status);
const revokeTo = (to: string) => ({ kind: 'revoke-class', project: 'ledgerline', changes: [{ class: 'qa.file-bug', to }], why: 'manual revoke' });

/** Each holder's qa.file-bug tier in belay-policy's tier-state.yml as it stands. */
function heldTiers(gl: Awaited<ReturnType<typeof liveRig>>['gl']): Record<string, string> {
  const agents = (parse(policyFiles(gl)['tier-state.yml'] ?? '') as { agents: Record<string, Record<string, { tier: string }>> }).agents;
  return Object.fromEntries(Object.entries(agents).flatMap(([a, cs]) => (cs['qa.file-bug'] ? [[a, cs['qa.file-bug'].tier]] : [])));
}

describe('revoke when several agents hold the class', () => {
  it('lowers both holders above the target, in one tier-state.yml commit, one preview line per holder', async () => {
    const { gl, deps } = await twoHolders('supervised');
    const r = await previewIntent(deps, revokeTo('assisted'));
    if (r.status !== 'preview') throw new Error(reason(r));
    expect(r.preview.notes).toEqual(['qa.file-bug · ai-qa-second: supervised -> assisted', 'qa.file-bug · ai-qa-acme-lab: supervised -> assisted']);
    expect(r.preview.diff.filter((l) => l.startsWith('+ '))).toHaveLength(2);
    expect((await confirmIntent(deps, revokeTo('assisted'), r.preview.previewId)).status).toBe('done');
    expect(gl.state.writes).toHaveLength(1);
    expect(heldTiers(gl)).toEqual({ 'ai-qa-second': 'assisted', 'ai-qa-acme-lab': 'assisted' });
  });

  it('leaves a holder already below the target alone', async () => {
    const { gl, deps } = await twoHolders('quarantined');
    const r = await previewIntent(deps, revokeTo('assisted'));
    if (r.status !== 'preview') throw new Error(reason(r));
    expect(r.preview.notes).toEqual(['qa.file-bug · ai-qa-second: quarantined, at or below assisted: left alone', 'qa.file-bug · ai-qa-acme-lab: supervised -> assisted']);
    expect(r.preview.diff.filter((l) => l.startsWith('+ '))).toHaveLength(1);
    expect((await confirmIntent(deps, revokeTo('assisted'), r.preview.previewId)).status).toBe('done');
    expect(heldTiers(gl)).toEqual({ 'ai-qa-second': 'quarantined', 'ai-qa-acme-lab': 'assisted' });
  });

  it('refuses when no holder is above the target, naming each holder', async () => {
    const { gl, deps } = await twoHolders('assisted');
    expect(reason(await previewIntent(deps, revokeTo('supervised')))).toMatch(/qa\.file-bug is ai-qa-second assisted, ai-qa-acme-lab supervised: Belay only lowers/);
    expect(gl.state.writes).toEqual([]);
  });
});

describe('promote when several agents hold the class', () => {
  it('refuses with the reason the gate gives', async () => {
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
