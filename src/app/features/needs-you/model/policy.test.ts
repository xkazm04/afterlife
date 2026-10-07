// A policy-MR decision (n1, n4) records only what the server answered: the write it planned, then the answer to Run.
import { describe, expect, it } from 'vitest';
import type { ActionPreview, ActionResponse } from '@/server/actions/types';
import { pickNeedsYouDemo } from '../data/pick';
import { reduce } from './reducer';
import { initialState } from './state';
import type { Action, NeedsState } from './types';

const demo = pickNeedsYouDemo();
const run = (s: NeedsState, ...actions: Action[]): NeedsState => actions.reduce((acc, a) => reduce(acc, a, demo), s);
const preview = (id: string, mode: 'demo' | 'live' = 'live'): ActionPreview => ({
  kind: 'promote-class', title: 'Promote patch-bump to assisted', summary: 'Opens a policy MR in acme-lab/belay-policy as kazdanm.', risk: 'policy', previewId: id, mode,
  commands: [
    { display: `glab api --method PUT projects/2/repository/files/tier-state.yml -f branch=belay/promote-${id}`, argv: [], risk: 'policy' },
    { display: 'glab api --method POST projects/2/merge_requests', argv: [], risk: 'low' },
  ],
  diff: ['-     patch-bump: { tier: quarantined }', '+     patch-bump: { tier: assisted }'],
});
const staged = () =>
  run(initialState(demo), { type: 'act', action: 'read-note' }, { type: 'act', action: 'stage-n4' }, { type: 'write', key: 'n4', view: { kind: 'preview', preview: preview('p1') } });
const ran = (response: ActionResponse): Action => ({ type: 'ran', key: 'n4', response });
const ok = (made?: string) => ({ display: 'd', exit: 0, ok: true, simulated: false, ...(made ? { made } : {}) });

describe('the write the server planned', () => {
  it('redraws the staged item from it, whenever it arrives', () => {
    const before = run(initialState(demo), { type: 'act', action: 'read-note' }, { type: 'act', action: 'stage-n4' });
    expect(before.out[0]?.commands).toEqual([]);
    expect(staged().out[0]?.commands).toEqual(preview('p1').commands.map((c) => c.display));
    expect(staged().writes.n4).toEqual({ kind: 'preview', preview: preview('p1') });
  });
});

describe('the answer to Run', () => {
  it('done names the MR GitLab opened, sends it from the outbox and records it', () => {
    const s = run(staged(), ran({ status: 'done', preview: preview('p1'), results: [ok('commit 1a2b3c4d'), ok('!23')] }));
    expect(s.status.n4).toBe('sent');
    expect(s.out).toHaveLength(0);
    expect(s.sent[0]).toBe('belay-policy!23 · Re-admit patch-bump as Assisted');
    expect(s.session[0]).toMatchObject({ kind: 'readmit', result: 'policy MR opened', ref: 'belay-policy!23 · waits for your merge' });
    expect(s.notice).toMatchObject({ channel: 'toast', text: 'Done · Re-admit patch-bump as Assisted · commit 1a2b3c4d · !23' });
  });

  it('a demo done is labelled simulated, names no MR and never says it ran as you', () => {
    const sim = { display: 'd', exit: 0, ok: true, simulated: true };
    const s = run(staged(), ran({ status: 'done', preview: preview('p1', 'demo'), results: [sim, sim] }));
    expect(s.session[0]).toMatchObject({ result: 'policy MR simulated', ref: 'simulated, no MR · waits for your merge' });
    expect(s.notice?.text).toBe('Simulated · Re-admit patch-bump as Assisted · demo mode: nothing was sent to GitLab');
    expect(s.notice?.text).not.toMatch(/ran as|pushed/);
  });

  it('failed keeps it staged and says what GitLab answered', () => {
    const s = run(staged(), ran({ status: 'failed', preview: preview('p1'), results: [{ display: 'd', exit: 403, ok: false, simulated: false, error: '403 Forbidden' }] }));
    expect(s.status.n4).toBe('staged');
    expect(s.out.map((o) => o.key)).toEqual(['n4']);
    expect(s.notice?.text).toMatch(/^Failed · Re-admit patch-bump as Assisted · command 1 of 2: 403 Forbidden \(exit 403\)/);
  });

  it('changed shows the new write in the outbox and says nothing ran', () => {
    const s = run(staged(), ran({ status: 'changed', preview: preview('p2') }));
    expect(s.status.n4).toBe('staged');
    expect(s.writes.n4).toEqual({ kind: 'preview', preview: preview('p2') });
    expect(s.out[0]?.commands[0]).toContain('belay/promote-p2');
    expect(s.notice?.text).toMatch(/^Changed · .* nothing ran/);
  });

  it('refused puts the reason where the write was, so Run has nothing to send', () => {
    const s = run(staged(), ran({ status: 'refused', reason: 'patch-bump has a supervised ceiling' }));
    expect(s.out[0]).toMatchObject({ commands: [], note: 'Belay refuses this write: patch-bump has a supervised ceiling. Nothing can run.' });
    expect(s.notice?.text).toBe('Refused · Re-admit patch-bump as Assisted · patch-bump has a supervised ceiling. Nothing ran.');
  });
});
