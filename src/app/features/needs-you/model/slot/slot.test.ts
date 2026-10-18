// One write lifecycle for every server-planned write: ask, preview, confirm, answer. The slot says when Run is open and
// when the write may be asked for again; a confirm with no answer closes Run until it is (the write may have run).
import { describe, expect, it } from 'vitest';
import type { ActionPreview, ActionResponse } from '@/server/actions/types';
import { NO_ANSWER } from '@/server/actions/words';
import type { Recall } from '@/server/actions/runs/journal';
import { pickNeedsYouDemo } from '../../data/pick';
import { buildOutItem } from '../outbox/outbox';
import { reduce } from '../reducer';
import { keysToAsk, recalledItem } from '../run';
import { initialState } from '../state';
import type { Action, NeedsState } from '../types';
import { asked, beginSend, canAsk, canRun, needsRecall, recalled, retry, settle, viewed, type WriteSlot } from './slot';

const demo = pickNeedsYouDemo();
const preview = (id: string): ActionPreview => ({
  kind: 'promote-class', title: 'Promote', summary: 's', risk: 'policy', previewId: id, mode: 'live', diff: ['+ x'],
  commands: [{ display: `glab api ${id}`, argv: [], risk: 'policy' }],
});
const ready = (id = 'p1'): WriteSlot => viewed(asked(), { kind: 'preview', preview: preview(id) });
const sending = (): WriteSlot => beginSend(ready())!;
const run = (s: NeedsState, ...a: Action[]) => a.reduce((acc, x) => reduce(acc, x, demo), s);

describe('the slot', () => {
  it('changed puts the new preview on screen and Run stays open', () => {
    const s = settle(ready('p1'), { status: 'changed', preview: preview('p2') }, 'w');
    expect(s.phase).toBe('ready');
    expect(s.view?.kind === 'preview' && s.view.preview.previewId).toBe('p2');
    expect(s.answer?.status).toBe('changed');
    expect(canRun(s)).toBe(true);
  });

  it('refused replaces the write with its reason: nothing to run, and it may be asked for again', () => {
    const s = settle(ready(), { status: 'refused', reason: 'cooldown until 2026-11-01' }, 'w');
    expect(s.view).toEqual({ kind: 'refused', reason: 'cooldown until 2026-11-01' });
    expect(canRun(s)).toBe(false);
    expect(canAsk(s)).toBe(true);
  });

  it('done records the MR GitLab named and closes Run', () => {
    const r: ActionResponse = { status: 'done', preview: preview('p1'), results: [{ display: 'd', exit: 0, ok: true, simulated: false, made: '!22' }] };
    const s = settle(sending(), r, 'w');
    expect(s.phase).toBe('answered');
    expect(s.answer).toMatchObject({ status: 'done', mr: '!22' });
    expect(canRun(s)).toBe(false);
  });

  it('no answer is unsure: Run is closed until the write is asked for again', () => {
    const s = settle(sending(), null, 'w');
    expect(s.phase).toBe('unsure');
    expect(s.answer?.text).toBe(NO_ANSWER);
    expect(canRun(s)).toBe(false);
    expect(canAsk(s)).toBe(true);
    expect(canRun(viewed(asked(s), { kind: 'preview', preview: preview('p3') }))).toBe(true);
  });

  it('a second send, or a send with no preview yet, is never begun', () => {
    expect(beginSend(sending())).toBeNull();
    expect(beginSend(asked())).toBeNull();
  });
});

describe('the desk on the slot', () => {
  it('a refused or unreachable preview can be asked for again', () => {
    const s = run(initialState(demo), { type: 'select', id: 'n1' }, { type: 'write', key: 'n1', view: { kind: 'refused', reason: 'unreachable' } });
    expect(keysToAsk(s, demo)).not.toContain('n1');
    expect(keysToAsk(run(s, { type: 'retry', key: 'n1' }), demo)).toContain('n1');
  });

  it('a confirm with no answer stays staged, and its outbox item has nothing to run and says why', () => {
    const staged = run(initialState(demo), { type: 'act', action: 'stage-n1' }, { type: 'write', key: 'n1', view: { kind: 'preview', preview: preview('p1') } });
    expect(staged.status.n1).toBe('staged');
    const s = run(staged, { type: 'ran', key: 'n1', response: null });
    expect(s.status.n1).toBe('staged');
    const item = buildOutItem('n1', demo, s.writes);
    expect(item?.commands).toEqual([]);
    expect(item?.note).toContain('may or may not have run');
    expect(s.out.find((o) => o.key === 'n1')).toMatchObject({ commands: [], note: item?.note });
    expect(s.notice?.text).toBe(NO_ANSWER);
  });
});

describe('an unsure write is asked about first: the server recalls its previewId', () => {
  const unsure = (): WriteSlot => settle(sending(), null, 'w');
  const doneWith = (made: string): Recall => ({
    kind: 'ran', at: '2026-10-16T08:00:00.000Z',
    response: { status: 'done', preview: preview('p1'), results: [{ display: 'd', exit: 0, ok: true, simulated: false, made }] },
  });

  it('ran: the recalled done is the answer, with the MR it named', () => {
    const s = unsure();
    expect(s.phase).toBe('unsure');
    expect(needsRecall(s)).toBe(true);
    const r = recalled(s, doneWith('!22'), 'w');
    expect(r.phase).toBe('answered');
    expect(r.answer).toMatchObject({ status: 'done', mr: '!22' });
  });

  it('never: nothing ran, so Run opens again on exactly the preview that was on screen', () => {
    const r = recalled(unsure(), { kind: 'never' }, 'w');
    expect(r.phase).toBe('ready');
    expect(r.view?.kind === 'preview' && r.view.preview.previewId).toBe('p1');
    expect(canRun(r)).toBe(true);
  });

  it('running: still unsure, and the answer says the write is still running, not to check GitLab', () => {
    const r = recalled(unsure(), { kind: 'running', since: '2026-10-16T08:00:00.000Z' }, 'w');
    expect(r.phase).toBe('unsure');
    expect(r.answer?.text).toMatch(/still running/i);
    expect(r.answer?.text).not.toBe(NO_ANSWER);
    expect(needsRecall(r)).toBe(true); // asked about again: it may have finished
  });

  it('unknown (a row an earlier process left running): unsure with Check GitLab, and Ask again then asks afresh', () => {
    const r = recalled(unsure(), { kind: 'unknown' }, 'w');
    expect(r.phase).toBe('unsure');
    expect(r.answer?.text).toContain('Check GitLab');
    expect(r.answer?.text).not.toMatch(/still running/i);
    expect(needsRecall(r)).toBe(false);
    expect(retry(r)?.phase).toBe('asking');
  });

  it('a recall is ignored by a slot that is not unsure', () => {
    const s = ready();
    expect(recalled(s, { kind: 'never' }, 'w')).toBe(s);
  });

  it('the desk: a recalled done sends the decision, naming the MR', () => {
    const staged = run(initialState(demo), { type: 'act', action: 'stage-n1' }, { type: 'write', key: 'n1', view: { kind: 'preview', preview: preview('p1') } });
    const lost = run(staged, { type: 'sending', key: 'n1' }, { type: 'ran', key: 'n1', response: null });
    const s = recalledItem(lost, 'n1', doneWith('!22'), demo);
    expect(s.status.n1).toBe('sent');
    expect(s.notice?.text).toContain('!22');
    expect(recalledItem(lost, 'n1', { kind: 'never' }, demo).out.find((o) => o.key === 'n1')?.runnable).toBe(true);
  });
});
