// Every demo gap with files previews through the gap door against the fake GitLab's seeded project: Needs you offers Stage
// on g1, g2 and g3, so the door must plan each, not refuse it, in the project the fixtures are written for.
import { describe, expect, it } from 'vitest';
import { DEMO } from '@/lib/demo';
import { liveRig } from '@/server/actions/__tests__/rig';
import { previewIntent } from '@/server/actions/run';
import { LEDGERLINE_REPO } from '../data/proposalG1';
import { gapSend } from './gap';

const proposal = (id: string) => {
  const p = DEMO.maturity.proposals.find((x) => x.id === id);
  if (!p) throw new Error(`no proposal ${id}`);
  return p;
};

describe('the demo gaps against the seeded project', () => {
  it.each(['g1', 'g2', 'g3'])('%s: the gap door returns a plan, not a refusal, and nothing is written', async (id) => {
    const { deps, gl } = await liveRig();
    const send = gapSend('ledgerline', proposal(id), 'demo');
    if (!send.ok) throw new Error(send.reason);
    const r = await previewIntent(deps, send.intent);
    expect(r.status === 'refused' ? r.reason : r.status, id).toBe('preview');
    if (r.status !== 'preview') return;
    const repo = gl.state.projects.find((p) => p.raw.name === 'ledgerline')?.raw.path_with_namespace;
    expect(repo).toBe(LEDGERLINE_REPO);
    expect(r.preview.summary).toContain(`of ${LEDGERLINE_REPO},`);
    expect(gl.state.writes).toEqual([]);
  });
});
