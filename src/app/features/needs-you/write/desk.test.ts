// n3's gaps go through the gap door, as n1 and n4 go through the promote door: previewAction when the gap is in view,
// confirmAction(intent, previewId) on Run, and an answer that says only what the response says. The actions are mocked.
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ActionPreview, ActionResponse } from '@/server/actions/types';
import { pickNeedsYouDemo } from '../data/pick';
import { reduce } from '../model/reducer';
import { initialState } from '../model/state';
import type { Action, NeedsState } from '../model/types';

const actions = vi.hoisted(() => ({ previewAction: vi.fn(), confirmAction: vi.fn() }));
vi.mock('@/server/actions/actions', () => actions);
const { askDesk, deskIntent, gapBlock, sendDesk } = await import('./desk');

const demo = pickNeedsYouDemo();
const preview = (id: string): ActionPreview => ({
  kind: 'stage-gap-mr', title: `Open the draft MR for gap ${id}`, summary: 's', risk: 'low', previewId: `pv-${id}`, mode: 'demo', diff: ['~ .gitlab-ci.yml (hunk: +3 lines)'],
  commands: [{ display: 'glab api --method POST projects/90010001/merge_requests', argv: [], risk: 'low' }],
});
const run = (s: NeedsState, ...a: Action[]) => a.reduce((acc, x) => reduce(acc, x, demo), s);
const ok = (made?: string) => ({ display: 'd', exit: 0, ok: true, simulated: false, ...(made ? { made } : {}) });

beforeEach(() => {
  actions.previewAction.mockReset();
  actions.confirmAction.mockReset();
});

describe('which gaps the desk sends', () => {
  it('g1..g3 send their proposal files; the probe says it is not built', () => {
    for (const id of ['g1', 'g2', 'g3']) expect(deskIntent(id, demo), id).toMatchObject({ kind: 'stage-gap-mr', project: 'ledgerline', gap: id });
    expect(deskIntent('g4', demo)).toBeNull();
    expect(gapBlock('g4', demo)).toMatch(/^Not built yet/);
    expect(gapBlock('g1', demo)).toBeNull();
  });
});

describe('n3 Run', () => {
  it('asks when the gap is in view, then confirms the intent with the id of the preview on screen, and the toast names only the MR the response names', async () => {
    const intent = deskIntent('g1', demo);
    if (!intent) throw new Error('no intent');
    actions.previewAction.mockResolvedValue({ status: 'preview', preview: preview('g1') } satisfies ActionResponse);
    const view = await askDesk(intent);
    expect(actions.previewAction).toHaveBeenCalledExactlyOnceWith(intent);
    let s = run(initialState(demo), { type: 'act', action: 'stage-gap:g1' }, { type: 'write', key: 'g1', view });
    expect(s.out[0]?.commands).toEqual(['glab api --method POST projects/90010001/merge_requests']);

    const done: ActionResponse = { status: 'done', preview: preview('g1'), results: [ok('commit 1a2b3c4d'), ok('!31')] };
    actions.confirmAction.mockResolvedValue(done);
    const response = await sendDesk(intent, s.writes.g1);
    expect(actions.confirmAction).toHaveBeenCalledExactlyOnceWith(intent, 'pv-g1');
    if (!response) throw new Error('no response');
    s = run(s, { type: 'ran', key: 'g1', response });
    expect(s.gapStatus.g1).toBe('sent');
    expect(s.out).toHaveLength(0);
    expect(s.notice).toMatchObject({ channel: 'toast', text: expect.stringContaining('!31') });
    expect(s.notice?.text).not.toMatch(/!4[567]|ran as/);
    expect(s.session[0]).toMatchObject({ kind: 'gaps', ref: 'ledgerline!31 · waits for your review' });
  });

  it('a demo done says simulated and names no MR', () => {
    const sim = { display: 'd', exit: 0, ok: true, simulated: true };
    const s = run(
      initialState(demo),
      { type: 'act', action: 'stage-gap:g2' },
      { type: 'ran', key: 'g2', response: { status: 'done', preview: preview('g2'), results: [sim, sim] } },
    );
    expect(s.notice?.text).toMatch(/^Simulated · gap g2/);
    expect(s.session[0]).toMatchObject({ result: 'gap MR simulated', ref: 'simulated, no MR · waits for your review' });
    expect(s.sent[0]).not.toMatch(/![0-9]/);
  });

  it('failed keeps it staged; changed puts the new write on screen; refused puts the reason where the write was', () => {
    const staged = run(initialState(demo), { type: 'act', action: 'stage-gap:g1' });
    const failed = run(staged, { type: 'ran', key: 'g1', response: { status: 'failed', preview: preview('g1'), results: [{ display: 'd', exit: 403, ok: false, simulated: false, error: '403 Forbidden' }] } });
    expect(failed.gapStatus.g1).toBe('staged');
    expect(failed.notice?.text).toMatch(/^Failed · gap g1/);
    const changed = run(staged, { type: 'ran', key: 'g1', response: { status: 'changed', preview: preview('new') } });
    expect(changed.writes.g1).toEqual({ kind: 'preview', preview: preview('new') });
    expect(changed.notice?.text).toMatch(/^Changed · gap g1.*nothing ran/);
    const refused = run(staged, { type: 'ran', key: 'g1', response: { status: 'refused', reason: "the hunk's context lines do not match .gitlab-ci.yml" } });
    expect(refused.out[0]).toMatchObject({ commands: [] });
    expect(refused.notice?.text).toMatch(/^Refused · gap g1/);
  });

  it('sends nothing without a preview on screen', async () => {
    const intent = deskIntent('g1', demo);
    if (!intent) throw new Error('no intent');
    expect(await sendDesk(intent, undefined)).toBeNull();
    expect(await sendDesk(intent, { kind: 'refused', reason: 'x' })).toBeNull();
    expect(actions.confirmAction).not.toHaveBeenCalled();
  });
});

describe('the live list', () => {
  it('sends no gap: a live gap item says where to act (Maturity)', async () => {
    const { elsewhere, liveIntent } = await import('../model/live');
    expect(liveIntent({ id: 'n3', kind: 'gaps', title: 'Pick the gaps to close', to: undefined }, 'ledgerline')).toBeNull();
    expect(elsewhere('gaps')).toMatch(/Maturity/);
    expect(elsewhere('gaps')).not.toMatch(/in GitLab/);
  });
});
