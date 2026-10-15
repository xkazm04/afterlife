// The Ladder's promotion against the real planner: the class the rule calls eligible becomes a promote-class intent, and
// the server's preview is the policy MR with the new record (its lease_expires from grant_ttl_days). The demo GitLab as
// the port and a seeded, polled index (the actions' live rig); nothing here mocks the planner.
import { describe, expect, it } from 'vitest';
import { getActionClasses } from '@/lib/demo';
import { promotion } from '@/lib/promotion';
import { liveRig, policyFiles } from '@/server/actions/__tests__/rig';
import { confirmIntent, previewIntent } from '@/server/actions/run';
import type { ActionResponse } from '@/server/actions/types';
import { repoPolicy } from '@/server/data/policy';
import { listCommands } from '@/server/index/repositories/commandsRun';
import { promoteAsk } from '../model/rules/promote';
import type { ClassRow } from '../model/types';
import { promoteIntent } from './promote';

const demoClass = (id: string, o: Partial<ClassRow> = {}): ClassRow => ({ ...getActionClasses().find((c) => c.id === id)!, pending: null, ...o });
/** qa.file-bug as live reads it once the poll opened its promotion ask: eligible, Supervised -> Hands-off. */
const qa = demoClass('qa.file-bug', { ask: { id: 'promote:ledgerline:qa.file-bug', from: 'supervised', to: 'hands_off', rules: [] } });

function intentOf(c: ClassRow, withAsk = true) {
  const a = promoteAsk(c, promotion(c, 'repro', repoPolicy()));
  if (!a) throw new Error(`${c.id} is not eligible`);
  return promoteIntent('ledgerline', a.id, a.to, withAsk ? a.proposal : undefined);
}
function previewOf(r: ActionResponse) {
  if (r.status !== 'preview') throw new Error(`expected a preview, got ${r.status}: ${'reason' in r ? r.reason : ''}`);
  return r.preview;
}

describe('promote from the Ladder', () => {
  it('an eligible class: the preview is a policy MR whose diff carries the target tier and lease_expires', async () => {
    const { gl, deps } = await liveRig();
    const intent = intentOf(qa);
    expect(intent).toEqual({ kind: 'promote-class', project: 'ledgerline', class: 'qa.file-bug', to: 'hands_off', proposal: 'promote:ledgerline:qa.file-bug' });
    const p = previewOf(await previewIntent(deps, intent));
    expect(p.kind).toBe('promote-class');
    expect(p.commands.some((c) => c.argv.includes('labels=belay::promotion'))).toBe(true);
    expect(p.diff.join('\n')).toMatch(/\+ +qa\.file-bug: \{ tier: hands_off, [^\n]*lease_expires: "2026-10-20/);
    expect(gl.state.writes).toEqual([]);
  });

  it('a quarantine is re-admitted at Assisted: no lease on that record', async () => {
    const { deps } = await liveRig();
    const p = previewOf(await previewIntent(deps, intentOf(demoClass('patch-bump'))));
    expect(p.diff.join('\n')).toMatch(/\+ +patch-bump: \{ tier: assisted, /);
    expect(p.diff.filter((l) => l.startsWith('+')).join('\n')).not.toContain('lease_expires');
  });

  it('a stale preview id: the answer is "changed" with the new preview, and nothing is written', async () => {
    const { gl, deps } = await liveRig();
    const intent = intentOf(qa);
    const p = previewOf(await previewIntent(deps, intent));
    policyFiles(gl)['tier-state.yml'] += '# someone committed meanwhile\n';
    const r = await confirmIntent(deps, intent, p.previewId);
    expect(r.status).toBe('changed');
    expect(r.status === 'changed' && r.preview.previewId).not.toBe(p.previewId);
    expect(gl.state.writes).toEqual([]);
    expect(gl.state.projects.find((x) => x.raw.name === 'belay-policy')?.mrs).toEqual([]);
  });

  it('no live ask (it was closed unmerged): the MR still opens; an ask that is not open is not a refusal either', async () => {
    for (const intent of [intentOf(qa, false), intentOf(qa)]) {
      const { gl, db, deps } = await liveRig();
      const r = await confirmIntent(deps, intent, previewOf(await previewIntent(deps, intent)).previewId);
      expect(r).toMatchObject({ status: 'done', results: [{ ok: true }, { ok: true, made: expect.stringMatching(/^!\d+$/) }] });
      expect(gl.state.projects.find((x) => x.raw.name === 'belay-policy')?.mrs.map((m) => m.title)).toEqual(['Promote qa.file-bug supervised -> hands_off']);
      expect((await listCommands(db, 'ledgerline')).map((c) => c.proposalId ?? null)).toEqual([intent.proposal ?? null, intent.proposal ?? null]);
    }
  });
});
